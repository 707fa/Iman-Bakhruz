const onlineStudents = new Map();
const socketToStudent = new Map();
const pendingInvites = new Map();

function normalizeStudent(payload) {
  const studentId = String(payload?.studentId || "").trim();
  const fullName = String(payload?.fullName || "Student").trim().slice(0, 80);
  const groupId = String(payload?.groupId || "").trim();
  if (!studentId || !groupId) return null;
  return { studentId, fullName, groupId };
}

function groupRoom(groupId) {
  return `ketka-group:${groupId}`;
}

function emitGroupPresence(io, groupId) {
  const students = [...onlineStudents.values()]
    .filter((student) => student.groupId === groupId)
    .map((student) => ({
      studentId: student.studentId,
      fullName: student.fullName,
      groupId: student.groupId,
    }));

  io.to(groupRoom(groupId)).emit("KETKA_ONLINE_STUDENTS", { groupId, students });
}

function removeSocketPresence(io, socket) {
  const studentId = socketToStudent.get(socket.id);
  if (!studentId) return;

  const previous = onlineStudents.get(studentId);
  socketToStudent.delete(socket.id);
  onlineStudents.delete(studentId);

  if (previous) {
    socket.leave(groupRoom(previous.groupId));
    emitGroupPresence(io, previous.groupId);
  }
}

function createInviteId() {
  return `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function registerKetkaSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("KETKA_REGISTER_STUDENT", (payload, reply) => {
      const student = normalizeStudent(payload);
      if (!student) {
        reply?.({ ok: false, error: "studentId and groupId are required." });
        return;
      }

      removeSocketPresence(io, socket);
      const onlineStudent = { ...student, socketId: socket.id, connectedAt: Date.now() };
      onlineStudents.set(student.studentId, onlineStudent);
      socketToStudent.set(socket.id, student.studentId);
      socket.join(groupRoom(student.groupId));
      emitGroupPresence(io, student.groupId);
      reply?.({ ok: true });
    });

    socket.on("KETKA_SEND_INVITE", (payload, reply) => {
      const fromStudentId = socketToStudent.get(socket.id);
      const fromStudent = fromStudentId ? onlineStudents.get(fromStudentId) : null;
      const toStudentId = String(payload?.toStudentId || "").trim();
      const toStudent = onlineStudents.get(toStudentId);

      if (!fromStudent) {
        reply?.({ ok: false, error: "Sender is not registered online." });
        return;
      }

      if (!toStudent || toStudent.groupId !== fromStudent.groupId) {
        reply?.({ ok: false, error: "Student is offline or not in your group." });
        return;
      }

      const invite = {
        inviteId: createInviteId(),
        fromStudentId: fromStudent.studentId,
        fromStudentName: fromStudent.fullName,
        toStudentId: toStudent.studentId,
        toStudentName: toStudent.fullName,
        groupId: fromStudent.groupId,
        createdAt: new Date().toISOString(),
      };
      pendingInvites.set(invite.inviteId, invite);

      io.to(toStudent.socketId).emit("KETKA_INVITE_RECEIVED", invite);
      reply?.({ ok: true, invite });
    });

    socket.on("KETKA_RESPOND_INVITE", (payload, reply) => {
      const inviteId = String(payload?.inviteId || "").trim();
      const accepted = Boolean(payload?.accepted);
      const invite = pendingInvites.get(inviteId);
      const responderId = socketToStudent.get(socket.id);

      if (!invite || invite.toStudentId !== responderId) {
        reply?.({ ok: false, error: "Invite not found." });
        return;
      }

      pendingInvites.delete(inviteId);
      const fromStudent = onlineStudents.get(invite.fromStudentId);
      const eventName = accepted ? "KETKA_INVITE_ACCEPTED" : "KETKA_INVITE_DECLINED";
      const responsePayload = {
        ...invite,
        accepted,
        respondedAt: new Date().toISOString(),
      };

      if (fromStudent) {
        io.to(fromStudent.socketId).emit(eventName, responsePayload);
      }
      socket.emit(eventName, responsePayload);
      reply?.({ ok: true, invite: responsePayload });
    });

    socket.on("disconnect", () => {
      removeSocketPresence(io, socket);
    });
  });
}

module.exports = { registerKetkaSocketHandlers };
