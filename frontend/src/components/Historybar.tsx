import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Menu, Trash2, Clock, Inbox } from "lucide-react";

type HistorybarProps = {
    onSelectDocument: (id: string | null) => void;
    selectedDocumentId: string | null;
}

export default function Historybar({ onSelectDocument, selectedDocumentId }: HistorybarProps) {
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const sidebarContentRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [documents, setDocuments] = useState<
        Array<{
            id: string;
            filename: string;
            created_at: string;
            status: string;
        }>
    >([]);
    const [isLoading, setIsLoading] = useState(false);
    const sidebarWidth = 250;
    const popoutDistance = 30;
    const BACKEND_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (!sidebarContentRef.current) return;
        gsap.set(sidebarContentRef.current, { x: -sidebarWidth });
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const controller = new AbortController();

        setIsLoading(true);
        fetch(`${BACKEND_URL}/api/documents`, {
            credentials: "include",
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    return null;
                }

                return response.json();
            })
            .then((payload) => {
                setDocuments(payload?.documents ?? []);
            })
            .catch((error) => {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                setDocuments([]);
            })
            .finally(() => {
                setIsLoading(false);
            });

        return () => controller.abort();
    }, [BACKEND_URL, isOpen]);
    
    const handleMenuClick = () => {
        if (!menuButtonRef.current) return;
        if (isOpen) {
            gsap.to(menuButtonRef.current, {
                x: 0,
                duration: 0.25,
                ease: "power2.out",
            });

            gsap.to(sidebarContentRef.current, {
                x: -sidebarWidth,
                duration: 0.25,
                ease: "power2.out",
            });
        } else {
            gsap.to(menuButtonRef.current, {
                x: sidebarWidth,
                duration: 0.25,
                ease: "power2.out",
            });

            gsap.to(sidebarContentRef.current, {
                x: 0,
                duration: 0.25,
                ease: "power2.out",
            });
        }
        setIsOpen(!isOpen);
    };

    const handleHistoryItemClick = (id: string) => {
        onSelectDocument(id);

        gsap.to(sidebarContentRef.current, {
            x: -sidebarWidth,
            duration: 0.25,
            ease: "power2.out",
        });
        
        gsap.to(menuButtonRef.current, {
            x: 0,
            duration: 0.25,
            ease: "power2.out",
        });
        setIsOpen(false);
    };

    const refreshDocuments = async () => {
        if (!isOpen) return;

        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/documents`, {
                credentials: "include",
            });

            if (!response.ok) {
                setDocuments([]);
                return;
            }

            const payload = await response.json();
            setDocuments(payload?.documents ?? []);
        } catch {
            setDocuments([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDocument = async (id: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
                method: "DELETE",
                credentials: "include",
            })

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Failed to delete PDF.");
            }

            if (id === selectedDocumentId) {
                onSelectDocument(null);
            }

            await refreshDocuments();
        } catch (error) {
            throw new Error("Failed to delete PDF.");
        }
    }

    const handleClickOutside = (e: React.MouseEvent) => {
        if (sidebarContentRef.current && !sidebarContentRef.current.contains(e.target as Node)) {
            gsap.to(sidebarContentRef.current, {
                x: -sidebarWidth,
                duration: 0.25,
                ease: "power2.out",
            });
            gsap.to(menuButtonRef.current, {
                x: 0,
                duration: 0.25,
                ease: "power2.out",
            });
            setIsOpen(false);
        }
    };

    const handleMouseEnter = () => {
        if (!menuButtonRef.current || isOpen) return;
        
        gsap.to(menuButtonRef.current, {
            x: isOpen ? sidebarWidth + popoutDistance : popoutDistance,
            duration: 0.25,
            ease: "power2.out",
        })

        gsap.to(sidebarContentRef.current, {
            x: isOpen ? popoutDistance : -sidebarWidth + popoutDistance,
            duration: 0.25,
            ease: "power2.out",
        });        
    };
    
    const handleMouseLeave = () => {
        if (!menuButtonRef.current || isOpen) return;
        
        gsap.to(menuButtonRef.current, {
            x: isOpen ? sidebarWidth : 0,
            duration: 0.25,
            ease: "power2.out",
        });

        gsap.to(sidebarContentRef.current, {
            x: isOpen ? 0: -sidebarWidth,
            duration: 0.25,
            ease: "power2.out",
        });
    };

    return (
        <>
            {isOpen && (
                <div className="sidebar-overlay" onClick={handleClickOutside}/>
            )}
            <button 
                id="menu-button"
                ref={menuButtonRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleMenuClick}
                >
                <Menu size={24} strokeWidth={1.5} />
            </button>
            <div 
                id="sidebar" 
                ref={sidebarContentRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={isOpen ? undefined : handleMenuClick}
            >
                <div className="sidebar-content" id={isOpen ? "" : "pointer"}>
                    <h2 className="sidebar-header">
                        <span className="sidebar-header__icon">
                            <Clock size={18} strokeWidth={2} />
                        </span>
                        Recent docs
                    </h2>
                    {isOpen && (
                        <ul className="history-list">
                            {isLoading && (
                                <li className="history-empty">
                                    <span className="history-empty__spinner" aria-hidden="true" />
                                    Loading documents…
                                </li>
                            )}
                            {!isLoading && documents.length === 0 && (
                                <li className="history-empty">
                                    <span className="history-empty__icon">
                                        <Inbox size={28} strokeWidth={1.5} />
                                    </span>
                                    <span className="history-empty__title">No documents yet</span>
                                    <span className="history-empty__hint">
                                        Uploaded PDFs will appear here
                                    </span>
                                </li>
                            )}
                            {documents.map((doc) => {
                                const isSelected = doc.id === selectedDocumentId;

                                return (
                                    <li key={doc.id} className={isSelected ? "is-selected" : ""}>
                                        <button onClick={() => handleHistoryItemClick(doc.id)}>
                                            <span className="history-item__text">
                                                <span className="history-item__name">{doc.filename}</span>
                                                <small className="history-item__date">
                                                    {new Date(doc.created_at).toLocaleString()}
                                                </small>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            className="history-item__delete"
                                            aria-label={`Delete ${doc.filename}`}
                                            onClick={() => handleDeleteDocument(doc.id)}
                                        >
                                            <Trash2 size={20} strokeWidth={1.5} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}