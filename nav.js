(function () {
  "use strict";
  var toggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");
  if (!toggle || !mobileNav) return;

  toggle.addEventListener("click", function () {
    var isOpen = !mobileNav.classList.contains("hidden");
    mobileNav.classList.toggle("hidden");
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });
})();
