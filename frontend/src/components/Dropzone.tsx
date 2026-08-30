import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { gsap } from "gsap";
import { Upload, Plus, Minus, ChevronLeft, ChevronRight } from "lucide-react";
// import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// pdfjs.GlobalWorkerOptions.workerSrc = worker;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
 
type DropzoneProps = {
    theme: "light" | "dark";
    documentId: string | null;
    selectedPage: number | null;
    selectedChunkBBox: [number, number, number, number] | null;
    onDocumentChange: (documentId: string | null) => void;
};

export default function Dropzone({ theme, documentId, selectedPage, selectedChunkBBox, onDocumentChange }: DropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
    const [PDF, setPDF] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState("1");
    const [pageScale, setPageScale] = useState(0.75);
    const [pageSizes, setPageSizes] = useState<Record<number, { width: number; height: number }>>({});
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [pageViewports, setPageViewports] = useState<Record<number, any>>({});
    const loadedDocumentIdRef = useRef<string | null>(null);
    const pageScales = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
    const dropzoneBaseColor = theme === "dark" ? "#1b1f27" : "#d5d5d5";
    const dropzoneHoverColor = theme === "dark" ? "#262b37" : "#dfdfdf";
    const BACKEND_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (selectedPage && numPages) {
            jumpToPage(selectedPage);
        }
    }, [selectedPage, numPages]);

    useEffect(() => {
        if (!documentId || documentId === loadedDocumentIdRef.current) return;

        let ignore = false;
        
        async function fetchDocument() {
            setIsUploading(true);
            setUploadError(null);
            try {
                const response = await fetch(`${BACKEND_URL}/api/documents/${documentId}`, {
                    method: "GET",
                    credentials: "include",
                });
        
                if (!response.ok) {
                    const message = await response.text();
                    throw new Error(message || "Failed to upload PDF.");
                }

                const blob = await response.blob();
                const file = new File([blob], "document.pdf", { type: "application/pdf" });

                if (!ignore) {
                    setPDF(file);
                    setCurrentPage(1);
                    setPageInput("1");
                    setNumPages(0);
                    loadedDocumentIdRef.current = documentId;
                }
            } catch (error) {
                if (!ignore) {
                    setPDF(null);
                    setUploadError(error instanceof Error ? error.message : "Failed to upload PDF.");
                }
            } finally {
                if (!ignore) setIsUploading(false);
            }
        }

        void fetchDocument();

        return () => {
            ignore = true;
        };
    }, [documentId, BACKEND_URL]);

    useEffect(() => {
        if (!dropZoneRef.current) return;

        gsap.set(dropZoneRef.current, {
            backgroundColor: dropzoneBaseColor,
            boxShadow: PDF
                ? "0 4px 8px 0 rgba(0, 0, 0, 0), 0 6px 20px 0 rgba(0, 0, 0, 0)"
                : "0 4px 8px 0 rgba(0, 0, 0, 0), 0 6px 20px 0 rgba(0, 0, 0, 0)",
        });
    }, [PDF, dropzoneBaseColor]);

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

    const jumpToPage = (pageNumber: number) => {
        if (!numPages || !dropZoneRef.current) return;

        const clampedPage = Math.min(Math.max(pageNumber, 1), numPages);
        const targetPage = pageRefs.current[clampedPage - 1];

        setCurrentPage(clampedPage);
        setPageInput(String(clampedPage));

        if (targetPage) {
            const offsetTop = targetPage.offsetTop - dropZoneRef.current.offsetTop;
            dropZoneRef.current.scrollTo({ top: offsetTop, behavior: "smooth" });
        }
    };

    const goToPreviousPage = () => {
        jumpToPage(currentPage - 1);
    };

    const goToNextPage = () => {
        jumpToPage(currentPage + 1);
    };

    const zoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        const index = pageScales.indexOf(pageScale);
        if (index > 0) {
            setPageScale(pageScales[index - 1]);
        }
    };

    const zoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        const index = pageScales.indexOf(pageScale);
        if (index < pageScales.length - 1) {
            setPageScale(pageScales[index + 1]);
        }
    };
    
    const handleClick = () => {
        if (PDF) return;
        inputRef.current?.click();
    };

    const uploadPdf = async (file: File) => {
        if (!BACKEND_URL) {
            setUploadError("Backend URL is not configured.");
            return;
        }
        setPDF(file);
        setCurrentPage(1);
        setPageInput("1");
        setNumPages(0);
        setUploadError(null);

        const formData = new FormData();
        formData.append("file", file);

        setIsUploading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/upload-pdf`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Failed to upload PDF.");
            }

            const data = await response.json();
            loadedDocumentIdRef.current = data.document_id ?? null;
            onDocumentChange(data.document_id ?? null);
        } catch (error) {
            setPDF(null);
            onDocumentChange(null);
            setUploadError(error instanceof Error ? error.message : "Failed to upload PDF.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleMouseEnter = () => {
        if (!dropZoneRef.current || dropZoneRef.current?.classList.contains('has-pdf')) return;

        gsap.to(dropZoneRef.current, {
            backgroundColor: dropzoneHoverColor,
            boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
            duration: 0.4,
            ease: "power2.out",
        });
    };
    
    const handleMouseLeave = () => {
        if (!dropZoneRef.current || dropZoneRef.current?.classList.contains('has-pdf')) return;
        
        gsap.to(dropZoneRef.current, {
            backgroundColor: dropzoneBaseColor,
            boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0), 0 6px 20px 0 rgba(0, 0, 0, 0)",
            duration: 0.4,
            ease: "power2.out",
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            void uploadPdf(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files?.[0];
        if (file) {
            void uploadPdf(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleResubmit = () => {
        setPDF(null);
        setNumPages(0);
        setCurrentPage(1);
        setPageInput("1");
        setPageScale(0.75);
        setPageSizes({});
        loadedDocumentIdRef.current = null;
        onDocumentChange(null);
        setUploadError(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    function BBoxHighlight({
        bbox,
        viewport,
    }: {
        bbox: [number, number, number, number];
        viewport: any;
    }) {
        if (!viewport) return null;

        const [x0, y0, x1, y1] = bbox;

        // Converting PyMuPDF coordinates to convertToViewportRectangle coordinates
        const pageHeightPts = viewport.height / viewport.scale;
        const flipped: [number, number, number, number] = [
            x0,
            pageHeightPts - y1,
            x1,
            pageHeightPts - y0,
        ];

        const [vx0, vy0, vx1, vy1] = viewport.convertToViewportRectangle(flipped);
        const left = Math.min(vx0, vx1);
        const top = Math.min(vy0, vy1);
        const width = Math.abs(vx1 - vx0);
        const height = Math.abs(vy1 - vy0);

        return (
            <div
                style={{
                    position: "absolute",
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: "rgba(255, 214, 0, 0.35)",
                    border: "1.5px solid rgba(255, 179, 0, 0.8)",
                    borderRadius: 2,
                    pointerEvents: "none",
                }}
            />
        );
    }

    return (
        <>
            <div className="drop-zone-container">

                <div id="drop-zone" 
                    ref={dropZoneRef}
                    onClick={handleClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={PDF ? "has-pdf" : "no-pdf"}
                >
                    <div
                        id="pdf-controls"
                        className={PDF ? "has-pdf" : ""}
                    >
                        <div className="pdf-controls-group">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goToPreviousPage();
                                }}
                                disabled={currentPage <= 1}
                                aria-label="Previous page"
                            >
                                <ChevronLeft />
                            </button>
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
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goToNextPage();
                                }}
                                disabled={currentPage >= numPages}
                                aria-label="Next page"
                            >
                                <ChevronRight />
                            </button>
                        </div>

                        <div className="pdf-controls-group pdf-controls-group--zoom">
                            <button type="button" onClick={zoomOut} aria-label="Zoom out">
                                <Minus />
                            </button>
                            <span>{Math.round(pageScale * 100)}%</span>
                            <button type="button" onClick={zoomIn} aria-label="Zoom in">
                                <Plus />
                            </button>
                        </div>
                    </div>
                    <Upload size={65} strokeWidth={1} className={PDF ? "has-pdf" : ""} />
                    <p className={PDF ? "has-pdf" : ""}>Upload file from computer or drag and drop file</p>
                    {isUploading && <p className="upload-status">Uploading PDF…</p>}
                    {uploadError && <p className="upload-error">{uploadError}</p>}
                    {PDF && (
                        <Document file={PDF} onLoadSuccess={({ numPages }) => {
                            setNumPages(numPages);
                            setCurrentPage(1);
                            setPageInput("1");
                        }}>
                            <div className="pdf-pages">
                                {Array.from({ length: numPages }, (_, index) => {
                                    const pageNumber = index + 1;
                                    return (
                                        <div
                                            key={`pdf-page-${pageNumber}`}
                                            className="pdf-page-wrapper"
                                            ref={(element) => {
                                                pageRefs.current[index] = element;
                                            }}
                                        >
                                            <Page
                                                pageNumber={pageNumber}
                                                scale={pageScale}
                                                onLoadSuccess={(page) => {
                                                    const viewport = page.getViewport({ scale: pageScale });
                                                    setPageViewports((prev) => ({ ...prev, [pageNumber]: viewport }));
                                                }}
                                            />
                                            {selectedPage === pageNumber && selectedChunkBBox && (
                                                <BBoxHighlight
                                                    bbox={selectedChunkBBox}
                                                    viewport={pageViewports[pageNumber]}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Document>
                    )}
                </div>
                {PDF && (
                    <button id="resubmit-button" type="button" onClick={handleResubmit}>
                        Upload New PDF
                    </button>
                )}
                <input id="upload" type="file" accept=".pdf" ref={inputRef} onChange={handleFileUpload}/>
            </div>
        </>
    )
}