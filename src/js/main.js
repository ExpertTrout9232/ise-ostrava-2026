document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("menu-open-btn");
  const closeBtn = document.getElementById("menu-close-btn");
  const overlay = document.getElementById("menu-overlay");
  const drawer = document.getElementById("side-drawer");

  const openMenu = () => {
    overlay.classList.remove("opacity-0", "pointer-events-none");
    overlay.classList.add("opacity-100", "pointer-events-auto");

    drawer.classList.remove("translate-x-full");
    drawer.classList.add("translate-x-0");

    document.body.style.overflow = "hidden";
  };

  const closeMenu = () => {
    overlay.classList.remove("opacity-100", "pointer-events-auto");
    overlay.classList.add("opacity-0", "pointer-events-none");

    drawer.classList.remove("translate-x-0");
    drawer.classList.add("translate-x-full");

    document.body.style.overflow = "";
  };

  openBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", closeMenu);
  overlay.addEventListener("click", closeMenu);
});
