let installed = false;

export function installDomMutationSafety() {
  if (installed || typeof window === "undefined" || typeof Node === "undefined") return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  // Browser translators can move text nodes outside React, which otherwise crashes the whole app.
  Node.prototype.removeChild = (function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  }) as typeof Node.prototype.removeChild;

  Node.prototype.insertBefore = (function <T extends Node>(this: Node, node: T, child: Node | null): T {
    if (child && child.parentNode !== this) return this.appendChild(node) as T;
    return originalInsertBefore.call(this, node, child) as T;
  }) as typeof Node.prototype.insertBefore;
}
