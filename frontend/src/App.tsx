import { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import Dropzone from "./components/Dropzone";
import Searchbar from "./components/Searchbar";

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 1 } });
    tl.fromTo("#title", { opacity: 0 }, { opacity: 1 }, 0)
      .fromTo("#subtitle", { opacity: 0 }, { opacity: 1 }, 0)
      .fromTo("#drop-zone", { opacity: 0 }, { opacity: 1 }, 0)
      .fromTo("#search-bar", { opacity: 0, y: 150 }, { opacity: 1, y: 0 }, 0)
      .fromTo("#description", { opacity: 0, y: 150 }, { opacity: 1, y: 0 }, "-=0.1")
      .fromTo("#login-button", { opacity: 0, y: -30 }, { opacity: 1, y: 0 }, "-=0.1");
  }, []);

  const openLoginDialog = () => {
    setIsLoginOpen(true);
  };

  const closeLoginDialog = () => {
    setIsLoginOpen(false);
  };

  const handleMouseEnter = () => {
    if (!loginButtonRef.current) return;

    gsap.to(loginButtonRef.current, {
      backgroundPosition: "50% 100%",
      duration: 0.5,
      ease: "power2.out"
    });
  };

  const handleMouseLeave = () => {
    if (!loginButtonRef.current) return;

    gsap.to(loginButtonRef.current, {
      backgroundPosition: "0% 0%",
      duration: 0.5,
      ease: "power2.out"
    });
  };
  
  const handleLoginSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    closeLoginDialog();
  };
  
  return (
    <>
      <button id="login-button" type="button" 
        onClick={openLoginDialog} 
        ref={loginButtonRef} 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}>Login</button>
      {isLoginOpen ? (
        <div className="login-overlay" onClick={closeLoginDialog}>
          <div className="login-dialog" onClick={(event) => event.stopPropagation()}>
            <h2>Login</h2>
            <form className="login-form" onSubmit={handleLoginSubmit}>
              <label>
                Username
                <input type="text" name="username" placeholder="Enter username" autoComplete="off"/>
              </label>
              <label>
                Password
                <input type="password" name="password" placeholder="Enter password" />
              </label>
              <div className="login-actions">
                <button type="button" onClick={closeLoginDialog}>Cancel</button>
                <button type="submit">Sign in</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
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
