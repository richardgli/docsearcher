import { useRef } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";

type GuestSaveDialogProps = {
    theme: "light" | "dark";
    open: boolean;
    onClose: () => void;
    onLogin: () => void;
};

export default function GuestSaveDialog({ theme, open, onClose, onLogin }: GuestSaveDialogProps) {
    if (!open) return null;

    const loginButtonRef = useRef<HTMLButtonElement>(null);
    const isDark = theme === "dark";

    const handleMouseEnter = () => {
        if (!loginButtonRef.current) return;

        const enterPos = theme === "dark" ? "0% 100%" : "75% 100%";

        gsap.to(loginButtonRef.current, {
            backgroundPosition: enterPos,
            duration: 0.5,
            ease: "power2.out",
        });
    };

    const handleMouseLeave = () => {
        if (!loginButtonRef.current) return;

        const leavePos = theme === "dark" ? "75% 100%" : "0% 100%";

        gsap.to(loginButtonRef.current, {
            backgroundPosition: leavePos,
            duration: 0.5,
            ease: "power2.out",
        });
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-save-dialog-title"
            className={`guest-save-dialog guest-save-dialog--${isDark ? "dark" : "light"}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="guest-save-dialog__card" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    aria-label="Close dialog"
                    className="guest-save-dialog__close"
                    onClick={onClose}
                >
                    <X size={16} />
                </button>

                <h3 id="guest-save-dialog-title" className="guest-save-dialog__title">
                    Create an account to save this PDF
                </h3>

                <p className="guest-save-dialog__copy">
                    Your documents and search history stay linked to your account, so you can pick up where you left off from any device.
                </p>

                <button
                    type="button"
                    className="login-button guest-save-dialog__login"
                    ref={loginButtonRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={onLogin}
                >
                    Continue with email
                </button>
                <button
                    type="button"
                    className="guest-save-dialog__continue"
                    onClick={onClose}
                >
                    Continue as guest
                </button>
            </div>
        </div>
    );
}
