import { useRef, useState } from "react";
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
    const [PDF, setPDF] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [pageScale, setPageScale] = useState(0.75);

    
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
        if (file) setPDF(file);
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
                <div id="pdf-controls" className={PDF ? "has-pdf" : ""}>
                    <button onClick={(e) =>  {
                        e.stopPropagation(); 
                        setPageScale(s => s - 0.25)
                    }}>
                        <Minus />
                    </button>
                    <span>{Math.round(pageScale * 100)}%</span>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        setPageScale(s => s + 0.25)
                    }}>
                        <Plus />
                    </button>
                </div>
                <Upload size={65} strokeWidth={1} className={PDF ? "has-pdf" : ""} />
                <p className={PDF ? "has-pdf" : ""}>Upload file from computer or drag and drop file</p>
                <Document file={PDF} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                    {Array.from({ length: numPages }, (_, i) => (
                        <div key={i} className="pdf-page-wrapper">
                            <Page pageNumber={i + 1} scale={pageScale}/>
                        </div>
                    ))}
                </Document>
            </div>
            <input id="upload" type="file" accept=".pdf" ref={inputRef} onChange={handleFileUpload}/>
        </>
    )
}