import Dropzone from "./components/Dropzone";
import Searchbar from "./components/Searchbar";

function App() {
  return (
    <>
      <button id="login-button" type="button">Login</button>
      <div className="background">
        <div>
          <p id="title">docsearcher</p>
          <p id="subtitle">
            a goated ai tool for finding specific information in PDFs WITHOUT keywords
          </p>
          <Searchbar />
          <p id="description">
            Describe what this website is and explain why its a better alternative to regular searching using ctrl + f as;dlkf jas;lf jawra; igheoaiugh o;asfkh ao;irguh ogiu ha;s oigha;sofgia;sofgi has;ofgi ha;oguh ear;ogi ha;goisadh o;osif gha;ogi hraw;og ihro;aihas;oflkjas f;oewoi;rigiroirwofgh aw or fiho idoshfasd fhasd;k
          </p>
        </div>
        <Dropzone />
      </div>
    </>
  )
}

export default App
