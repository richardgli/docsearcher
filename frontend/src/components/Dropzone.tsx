export default function Dropzone() {
    return (
        <>
            <div id="drop-zone">
                <p>Upload file from computer or drag and drop file</p>
                <input type="file" name="upload-file" accept=".pdf"/>
            </div>
        </>
    )
}