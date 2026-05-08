import { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { Menu } from "lucide-react";

export default function Historybar() {
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const sidebarContentRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const sidebarWidth = 250;

    useEffect(() => {
        if (!sidebarContentRef.current) return;
        gsap.set(sidebarContentRef.current, { x: -sidebarWidth });
    }, []);
    
    const handleMenuClick = () => {
        if (!menuButtonRef.current || !sidebarContentRef.current) return;
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

    const handleHistoryItemClick = (item: string) => {
        console.log("Clicked:", item);
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
        if (!menuButtonRef.current || !sidebarContentRef.current || isOpen) return;
        
        gsap.to(menuButtonRef.current, {
            x: isOpen ? sidebarWidth + 7 : 7,
            duration: 0.25,
            ease: "power2.out",
        })

        gsap.to(sidebarContentRef.current, {
            x: isOpen ? 7 : -sidebarWidth + 7,
            duration: 0.25,
            ease: "power2.out",
        });        
    };
    
    const handleMouseLeave = () => {
        if (!menuButtonRef.current || !sidebarContentRef.current || isOpen) return;
        
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
            >
                <div className="sidebar-content">
                    <ul className="history-list">
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 1")}>
                                Recent search 1
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 2")}>
                                Recent search 2
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                        <li>
                            <button onClick={() => handleHistoryItemClick("Search 3")}>
                                Recent search 3
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </>
    );
}