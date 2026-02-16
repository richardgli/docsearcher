export default function Dropzone() {

    const handleClick

    return (
        <>
            <div id="drop-zone" onClick={handleClick}>
                <p>Upload file from computer or drag and drop file</p>
            </div>
            <input id="upload" type="file" accept=".pdf"/>
        </>
    )
}