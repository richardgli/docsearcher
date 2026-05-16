import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { gsap } from "gsap";
import { Upload, Plus, Minus } from "lucide-react";
// import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// pdfjs.GlobalWorkerOptions.workerSrc = worker;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
 
export default function Dropzone() {
    const inputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
    const [PDF, setPDF] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState("1");
    const [pageScale, setPageScale] = useState(0.75);
    const pageScales = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

    useEffect(() => {
        if (!PDF || !dropZoneRef.current || !numPages) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter((entry) => entry.isIntersecting);

                if (!visibleEntries.length) return;

                const mostVisibleEntry = visibleEntries.reduce((bestEntry, entry) => {
                    return entry.intersectionRatio > bestEntry.intersectionRatio ? entry : bestEntry;
                }, visibleEntries[0]);

                const pageIndex = pageRefs.current.findIndex((page) => page === mostVisibleEntry.target);

                if (pageIndex !== -1) {
                    setCurrentPage(pageIndex + 1);
                }
            },
            {
                root: dropZoneRef.current,
                threshold: [0.25, 0.5, 0.75, 1],
            },
        );

        pageRefs.current.forEach((page) => {
            if (page) {
                observer.observe(page);
            }
        });

        return () => observer.disconnect();
    }, [PDF, numPages, pageScale]);

    useEffect(() => {
        setPageInput(String(currentPage));
    }, [currentPage]);

    useEffect(() => {
        if (!PDF || !dropZoneRef.current) return;

        const updatePosition = () => {
            if (!dropZoneRef.current) return;
            const rect = dropZoneRef.current.getBoundingClientRect();
            const controls = document.getElementById('pdf-controls');
            if (!controls) return;
            controls.style.left = `${rect.left + rect.width / 2}px`;
            controls.style.transform = 'translateX(-50%)';
        };

        updatePosition();

        const observer = new ResizeObserver(updatePosition);
        observer.observe(dropZoneRef.current);
        window.addEventListener('resize', updatePosition);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updatePosition);
        };
    }, [PDF]);
    
    const jumpToPage = (pageNumber: number) => {
        if (!numPages) return;

        const clampedPage = Math.min(Math.max(pageNumber, 1), numPages);
        const targetPage = pageRefs.current[clampedPage - 1];

        setCurrentPage(clampedPage);
        setPageInput(String(clampedPage));

        targetPage?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };
    
    const handleClick = () => {
        if (PDF) return;
        inputRef.current?.click();
    };

    const handleMouseEnter = () => {
        if (!dropZoneRef.current) return;

        gsap.to(dropZoneRef.current, {
            backgroundColor: "#dfdfdf",
            duration: 0.1,
            ease: "power2.out",
        });
    };
    
    const handleMouseLeave = () => {
        if (!dropZoneRef.current) return;
        
        gsap.to(dropZoneRef.current, {
            backgroundColor: "#d5d5d5",
            duration: 0.1,
            ease: "power2.out",
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPDF(file);
            setCurrentPage(1);
            setPageInput("1");
            setNumPages(0);
        }
    };

    return (
        <>
            <div id="drop-zone" 
                 ref={dropZoneRef}
                 onClick={handleClick}
                 onMouseEnter={handleMouseEnter}
                 onMouseLeave={handleMouseLeave}
                 className={PDF ? "has-pdf" : ""}
            >
                <div
                    id="pdf-controls"
                    className={PDF ? "has-pdf" : ""}
                >
                    <label htmlFor="page-jump-input">Page</label>
                    <input
                        id="page-jump-input"
                        type="number"
                        min={1}
                        max={numPages || undefined}
                        value={pageInput}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            setPageInput(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const value = Number.parseInt(pageInput, 10);
                                if (value > numPages || value < 1) {
                                    setPageInput(String(currentPage));
                                    return;   
                                }
                                jumpToPage(value);
                            }
                        }}
                        onBlur={() => {
                            const value = Number.parseInt(pageInput, 10);
                            if (value > numPages || value < 1) {
                                setPageInput(String(currentPage));
                                return;
                            }
                            jumpToPage(value);
                        }}
                    />
                    <span>/ {numPages}</span>

                    <button type="button" onClick={(e) =>  {
                        e.stopPropagation(); 
                        const index = pageScales.indexOf(pageScale);
                        if (index > 0) {
                            setPageScale(pageScales[index - 1]);
                        } 
                    }}>
                        <Minus />
                    </button>
                    <span>{Math.round(pageScale * 100)}%</span>
                    <button type="button" onClick={(e) => {
                        e.stopPropagation();
                        const index = pageScales.indexOf(pageScale);
                        if (index < pageScales.length - 1) {
                            setPageScale(pageScales[index + 1]);
                        }
                    }}>
                        <Plus />
                    </button>
                </div>
                <Upload size={65} strokeWidth={1} className={PDF ? "has-pdf" : ""} />
                <p className={PDF ? "has-pdf" : ""}>Upload file from computer or drag and drop file</p>
                {PDF && (
                    <Document file={PDF} onLoadSuccess={({ numPages }) => {
                        setNumPages(numPages);
                        setCurrentPage(1);
                        setPageInput("1");
                    }}>
                        <div className="pdf-pages">
                            {Array.from({ length: numPages }, (_, index) => (
                                <div
                                    key={`pdf-page-${index + 1}`}
                                    className="pdf-page-wrapper"
                                    ref={(element) => {
                                        pageRefs.current[index] = element;
                                    }}
                                >
                                    <Page pageNumber={index + 1} scale={pageScale} />
                                </div>
                            ))}
                        </div>
                    </Document>
                )}
            </div>
            <input id="upload" type="file" accept=".pdf" ref={inputRef} onChange={handleFileUpload}/>
        </>
    )
}