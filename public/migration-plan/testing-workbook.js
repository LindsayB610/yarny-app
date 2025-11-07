(function () {
  function isTokenExpired(token) {
    if (!token) return true;

    try {
      const decoded = atob(token);
      const parts = decoded.split(":");

      if (parts.length !== 2) return true;

      const timestamp = parseInt(parts[1], 10);
      if (Number.isNaN(timestamp)) return true;

      const SESSION_DURATION_MS = 48 * 60 * 60 * 1000;
      const age = Date.now() - timestamp;

      return age > SESSION_DURATION_MS;
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return true;
    }
  }

  function checkAuthStatus() {
    const authToken = window.localStorage.getItem("yarny_auth");
    const isLoggedIn = authToken && !isTokenExpired(authToken);

    const storiesLink = document.getElementById("storiesNavLink");
    const loginLink = document.getElementById("loginNavLink");

    if (isLoggedIn) {
      if (storiesLink) storiesLink.style.display = "inline-block";
      if (loginLink) loginLink.style.display = "none";
    } else {
      if (storiesLink) storiesLink.style.display = "none";
      if (loginLink) loginLink.style.display = "inline-block";
    }
  }

  function hydrateCheckboxes(checkboxes, storageKey) {
    if (!checkboxes.length) return;

    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const state = JSON.parse(saved);
      state.forEach((item) => {
        const checkbox = document.getElementById(item.id);
        if (checkbox) {
          checkbox.checked = Boolean(item.checked);
        }
      });
    } catch (error) {
      console.error("Error loading saved workbook state:", error);
    }
  }

  function persistCheckboxes(checkboxes, storageKey) {
    if (!checkboxes.length) return;

    const payload = Array.from(checkboxes).map((cb) => ({
      id: cb.id,
      checked: cb.checked,
    }));

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  function computeStats(checkboxes) {
    const total = checkboxes.length;
    const completed = Array.from(checkboxes).filter((cb) => cb.checked).length;
    const remaining = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, remaining, percent };
  }

  function renderStats(checkboxes) {
    const { total, completed, remaining, percent } = computeStats(checkboxes);

    const totalEl = document.getElementById("totalTests");
    const completedEl = document.getElementById("completedTests");
    const remainingEl = document.getElementById("remainingTests");
    const percentEl = document.getElementById("completionPercent");

    if (totalEl) totalEl.textContent = total;
    if (completedEl) completedEl.textContent = completed;
    if (remainingEl) remainingEl.textContent = remaining;
    if (percentEl) percentEl.textContent = percent + "%";
  }

  function setupMobileMenu(sidebar, backdrop) {
    if (!sidebar) return;

    let menuButton = document.querySelector(".mobile-menu-toggle");
    if (!menuButton) {
      menuButton = document.createElement("button");
      menuButton.className = "mobile-menu-toggle";
      menuButton.setAttribute("aria-label", "Toggle menu");
      menuButton.innerHTML = "☰";
      document.body.appendChild(menuButton);
    }

    function toggleSidebar() {
      sidebar.classList.toggle("open");
      if (backdrop) {
        backdrop.classList.toggle("active", sidebar.classList.contains("open"));
      }
    }

    menuButton.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleSidebar();
    });

    if (backdrop) {
      backdrop.addEventListener("click", function () {
        sidebar.classList.remove("open");
        backdrop.classList.remove("active");
      });
    }

    document.addEventListener("click", function (event) {
      if (window.innerWidth > 900) return;
      if (!sidebar.classList.contains("open")) return;
      const target = event.target;
      if (target instanceof Element) {
        if (!sidebar.contains(target) && !target.classList.contains("mobile-menu-toggle")) {
          sidebar.classList.remove("open");
          if (backdrop) backdrop.classList.remove("active");
        }
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900 && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        if (backdrop) backdrop.classList.remove("active");
      }
    });
  }

  function setupNavHighlight(sections, navLinks) {
    if (!sections.length || !navLinks.length) return;

    function updateActiveNav() {
      let current = "";
      const scrollPos = window.scrollY + 100;

      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          current = section.getAttribute("id") || "";
        }
      });

      navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        if (!href) return;
        if (href === "#" + current) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });
    }

    window.addEventListener("scroll", updateActiveNav);
    window.addEventListener("resize", updateActiveNav);
    updateActiveNav();
  }

  document.addEventListener("DOMContentLoaded", function () {
    checkAuthStatus();

    const storageKey = document.body.dataset.storageKey || "testingWorkbookState";
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    hydrateCheckboxes(checkboxes, storageKey);
    renderStats(checkboxes);

    document.addEventListener("change", function (event) {
      if (!(event.target instanceof HTMLInputElement)) return;
      if (event.target.type !== "checkbox") return;

      renderStats(checkboxes);
      persistCheckboxes(checkboxes, storageKey);
    });

    const sidebar = document.querySelector(".docs-sidebar");
    const backdrop = document.querySelector(".sidebar-backdrop");
    setupMobileMenu(sidebar, backdrop);

    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
    const trackedSections = document.querySelectorAll(
      ".docs-content [data-section-anchor]"
    );
    setupNavHighlight(trackedSections, navLinks);

    navLinks.forEach((link) => {
      link.addEventListener("click", function () {
        if (window.innerWidth > 900) return;
        if (!sidebar) return;
        sidebar.classList.remove("open");
        if (backdrop) backdrop.classList.remove("active");
      });
    });
  });
})();


