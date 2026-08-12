(function () {
  "use strict";
  var tabBtns = document.querySelectorAll(".tab-btn");
  var panels = {
    pre: document.getElementById("panel-pre"),
    post: document.getElementById("panel-post"),
  };
  if (!tabBtns.length) return;

  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.dataset.tab;
      tabBtns.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      Object.keys(panels).forEach(function (key) {
        panels[key].classList.toggle("is-active", key === target);
      });
      window.dispatchEvent(new CustomEvent("savesignal:tabchange", { detail: { tab: target } }));
    });
  });
})();
