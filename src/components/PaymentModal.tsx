import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { COURSE_PRICE, COURSE_PRICE_USD, savePaymentState } from "../lib/payment";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMethod = "payme" | "click" | "card";
type PaymentStep = "select" | "processing" | "success";

export function PaymentModal({ open, onClose, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>("select");
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  async function handlePay(selectedMethod: PaymentMethod) {
    setMethod(selectedMethod);
    setStep("processing");

    await new Promise((r) => setTimeout(r, 2000));

    savePaymentState(selectedMethod, selectedMethod === "card" ? COURSE_PRICE_USD : COURSE_PRICE);
    setStep("success");

    setTimeout(() => {
      onSuccess();
    }, 1500);
  }

  function handleClose() {
    setStep("select");
    setMethod(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-surface"
          >
            <button onClick={handleClose} className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-text-3 hover:text-text">
              <X className="h-4 w-4" />
            </button>

            {step === "select" ? (
              <div className="p-8">
                <h3 className="mb-2 text-2xl font-bold text-text">Get Full Access</h3>
                <p className="mb-6 text-sm text-text-3">Unlock all 6 modules and 30+ lessons</p>

                <div className="mb-6 rounded-2xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 p-4 text-center">
                  <p className="text-sm text-text-3">Course Price</p>
                  <p className="mt-1 font-display text-3xl font-bold gradient-text">{COURSE_PRICE.toLocaleString()} UZS</p>
                  <p className="text-xs text-text-3">≈ ${COURSE_PRICE_USD} USD</p>
                </div>

                <div className="space-y-3">
                  <button onClick={() => void handlePay("payme")} className="flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-violet-500/30 hover:bg-white/[0.06]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-text">Payme</p>
                      <p className="text-xs text-text-3">Pay with Payme wallet</p>
                    </div>
                  </button>

                  <button onClick={() => void handlePay("click")} className="flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-cyan-500/30 hover:bg-white/[0.06]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-text">Click</p>
                      <p className="text-xs text-text-3">Pay with Click wallet</p>
                    </div>
                  </button>

                  <button onClick={() => void handlePay("card")} className="flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-emerald-500/30 hover:bg-white/[0.06]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-text">Bank Card</p>
                      <p className="text-xs text-text-3">Visa / Mastercard / Uzcard</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : step === "processing" ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="mb-6 h-12 w-12 animate-spin text-violet-400" />
                <p className="text-lg font-semibold text-text">Processing Payment</p>
                <p className="mt-2 text-sm text-text-3">
                  {method === "payme" ? "Connecting to Payme..." : method === "click" ? "Connecting to Click..." : "Processing card payment..."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15 }}>
                  <CheckCircle2 className="mb-6 h-16 w-16 text-emerald-400" />
                </motion.div>
                <p className="text-lg font-semibold text-text">Payment Successful!</p>
                <p className="mt-2 text-sm text-text-3">Unlocking course content...</p>
              </div>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
