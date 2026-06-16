const DISMISSED_NOTIFICATIONS_STORAGE_KEY = "ise2026.notifications.dismissed";
const NOTIFICATIONS_SOURCE_PATH = "./notifications.json";
const NOTIFICATION_INITIAL_DELAY_MS = 800;
const DESKTOP_BREAKPOINT_PX = 600;

const initMobileMenu = () => {
  const openBtn = document.getElementById("menu-open-btn");
  const closeBtn = document.getElementById("menu-close-btn");
  const overlay = document.getElementById("menu-overlay");
  const drawer = document.getElementById("side-drawer");

  if (!openBtn || !closeBtn || !overlay || !drawer) {
    return;
  }

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
};

const getDismissedNotificationIds = () => {
  try {
    const rawDismissed = localStorage.getItem(DISMISSED_NOTIFICATIONS_STORAGE_KEY);

    if (!rawDismissed) {
      return new Set();
    }

    const parsedDismissed = JSON.parse(rawDismissed);

    if (!Array.isArray(parsedDismissed)) {
      return new Set();
    }

    return new Set(parsedDismissed);
  } catch {
    return new Set();
  }
};

const saveDismissedNotificationIds = (dismissedIds) => {
  try {
    localStorage.setItem(DISMISSED_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(dismissedIds)));
  } catch {
    // Ignore storage errors to avoid breaking the page when storage is unavailable.
  }
};

const createNotificationsContainer = () => {
  const container = document.createElement("div");
  container.id = "site-notifications";
  container.setAttribute("aria-live", "polite");
  container.className = "fixed right-4 bottom-4 z-navbar flex w-[min(92vw,24rem)] flex-col gap-3";

  return container;
};

const createNotificationCard = (notification, onDismiss) => {
  const card = document.createElement("article");
  card.setAttribute("role", "status");
  card.className =
    "site-notification-card relative overflow-hidden rounded-lg border border-black/10 bg-white py-4 pr-11 pl-4 text-[18px]/[28px] text-[#010101] shadow-md";

  const accent = document.createElement("div");
  accent.setAttribute("aria-hidden", "true");
  accent.className = "absolute inset-y-0 left-0 w-1.5 bg-[#00B497]";

  const message = document.createElement("p");
  message.textContent = notification.message;
  message.className = "m-0 pl-3";

  const dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.textContent = "x";
  dismissButton.setAttribute("aria-label", "Dismiss notification");
  dismissButton.className =
    "absolute top-2.5 right-3 cursor-pointer border-0 bg-transparent p-0 text-[20px]/[24px] text-black transition-all duration-200 hover:font-medium focus:outline-none";

  dismissButton.addEventListener("click", () => {
    card.classList.remove("is-visible");
    card.classList.add("is-leaving");

    window.setTimeout(() => {
      onDismiss(notification.id);
      card.remove();
    }, 280);
  });

  card.append(accent, message, dismissButton);

  return card;
};

const loadNotifications = async () => {
  try {
    const response = await fetch(NOTIFICATIONS_SOURCE_PATH, { cache: "no-store" });

    if (!response.ok) {
      return [];
    }

    const parsed = await response.json();

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
};

const isHomepage = () => {
  const currentPath = window.location.pathname;

  return currentPath === "/" || currentPath.endsWith("/index.html");
};

const waitForNotificationDelay = () => {
  return new Promise((resolve) => {
    window.setTimeout(resolve, NOTIFICATION_INITIAL_DELAY_MS);
  });
};

const waitForDesktopHomepageScroll = () => {
  if (!isHomepage() || window.innerWidth < DESKTOP_BREAKPOINT_PX) {
    return Promise.resolve();
  }

  const content = document.getElementById("content");
  const contentTop = content ? content.getBoundingClientRect().top + window.scrollY : window.innerHeight;
  const triggerScrollY = Math.max(0, contentTop - window.innerHeight / 2);

  return new Promise((resolve) => {
    const onScroll = () => {
      if (window.scrollY >= triggerScrollY) {
        window.removeEventListener("scroll", onScroll);
        resolve();
      }
    };

    onScroll();

    if (window.scrollY < triggerScrollY) {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  });
};

const initNotifications = async () => {
  const notifications = await loadNotifications();

  if (notifications.length === 0) {
    return;
  }

  const dismissedIds = getDismissedNotificationIds();

  const visibleNotifications = notifications.filter((notification) => {
    if (!notification.id || !notification.message) {
      return false;
    }

    if (dismissedIds.has(notification.id)) {
      return false;
    }

    return true;
  });

  if (visibleNotifications.length === 0) {
    return;
  }

  await Promise.all([waitForNotificationDelay(), waitForDesktopHomepageScroll()]);

  const container = createNotificationsContainer();

  const dismissNotification = (notificationId) => {
    dismissedIds.add(notificationId);
    saveDismissedNotificationIds(dismissedIds);
  };

  document.body.appendChild(container);

  visibleNotifications.forEach((notification) => {
    const card = createNotificationCard(notification, dismissNotification);
    container.appendChild(card);

    window.setTimeout(() => {
      card.classList.add("is-visible");
    }, 30);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  void initNotifications();
});
