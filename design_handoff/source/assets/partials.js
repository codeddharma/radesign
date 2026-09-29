/* Shared nav + footer. Pages call with: window.__page = { active: "home" } */
(function () {
  const active = (window.__page && window.__page.active) || "";

  const nav = `
  <nav class="nav">
    <a href="index.html" class="brand" aria-label="R.A. Design Studio — home">
      <img src="assets/logo-full.png" alt="R.A. Design Studio" class="brand-logo"/>
    </a>
    <div class="nav-links">
      <a href="work.html"    class="${active === "work"    ? "active" : ""}">Work</a>
      <a href="studio.html"  class="${active === "studio"  ? "active" : ""}">Studio</a>
      <a href="press.html"   class="${active === "press"   ? "active" : ""}">Press</a>
      <a href="careers.html" class="${active === "careers" ? "active" : ""}">Careers</a>
      <a href="contact.html" class="${active === "contact" ? "active" : ""}">Contact</a>
    </div>
  </nav>`;

  const footer = `
  <footer class="footer">
    <div class="container">
      <div class="big">Let's build <em>something</em> lasting.</div>
      <div class="top">
        <div>
          <h5>Studio</h5>
          <div class="addr">
            Behind Aagman Party Plot,<br/>
            Shilaj Ranchharda Road,<br/>
            Ahmedabad 380059, IN.
          </div>
        </div>
        <div>
          <h5>Contact</h5>
          <ul>
            <li><a href="mailto:hello@radesignstudio.in">hello@radesignstudio.in</a></li>
            <li>+91 76006 02008</li>
          </ul>
        </div>
        <div>
          <h5>Navigate</h5>
          <ul>
            <li><a href="work.html">Work</a></li>
            <li><a href="studio.html">Studio</a></li>
            <li><a href="press.html">Press</a></li>
            <li><a href="careers.html">Careers</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div>
          <h5>Follow</h5>
          <ul>
            <li><a href="#">Instagram</a></li>
            <li><a href="#">LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div class="bottom">
        <span>© 1994 — 2026 R.A. Design Studio</span>
        <span>Ahmedabad · Mumbai · Bengaluru</span>
      </div>
    </div>
  </footer>`;

  document.addEventListener("DOMContentLoaded", () => {
    const n = document.getElementById("nav-slot");
    const f = document.getElementById("footer-slot");
    if (n) n.innerHTML = nav;
    if (f) f.innerHTML = footer;
  });
})();
