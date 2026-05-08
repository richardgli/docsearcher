import { useRef } from "react";
import { gsap } from "gsap";
import { Upload } from "lucide-react";

export default function Dropzone() {
    const inputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const handleClick = () => {
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

    return (
        <>
            <div id="drop-zone" 
                 ref={dropZoneRef}
                 onClick={handleClick}
                 onMouseEnter={handleMouseEnter}
                 onMouseLeave={handleMouseLeave}
            >
                <Upload size={65} strokeWidth={1} />
                <p>Upload file from computer or drag and drop file</p>
            </div>
            <input id="upload" type="file" accept=".pdf" ref={inputRef}/>
        </>
    )
}