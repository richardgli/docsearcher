import { useRef } from "react";
import { Upload } from "lucide-react";

export default function Dropzone() {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        inputRef.current?.click();
    }

    return (
        <>
            <div id="drop-zone" onClick={handleClick}>
                <Upload size={65} strokeWidth={1} />
                <p>Upload file from computer or drag and drop file</p>
            </div>
            <input id="upload" type="file" accept=".pdf" ref={inputRef}/>
        </>
    )
}