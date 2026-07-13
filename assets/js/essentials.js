(() => {
    const switcher = document.querySelector(".essentials-switcher");

    /*
     * Capsule tabs
     */
    if (switcher) {
        const tabs = Array.from(
            switcher.querySelectorAll('.essentials-tabs > [role="tab"]')
        );

        const panels = Array.from(
            switcher.querySelectorAll('.essentials-panels > [role="tabpanel"]')
        );

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        const getPanelForTab = (tab) => {
            const panelId = tab.getAttribute("aria-controls");
            return document.getElementById(panelId);
        };

        const getPanelFromHash = () => {
            const id = window.location.hash.slice(1);

            if (!id) {
                return null;
            }

            const target = document.getElementById(id);

            if (!target) {
                return null;
            }

            if (target.matches('[role="tabpanel"]')) {
                return target;
            }

            return target.closest('[role="tabpanel"]');
        };

        const getTabForPanel = (panel) => {
            if (!panel) {
                return null;
            }

            return tabs.find(
                (tab) => tab.getAttribute("aria-controls") === panel.id
            );
        };

        const activateTab = (
            activeTab,
            {
                updateHash = false,
                moveFocus = false,
                scrollToPanel = false
            } = {}
        ) => {
            const activePanel = getPanelForTab(activeTab);

            if (!activePanel) {
                return;
            }

            tabs.forEach((tab) => {
                const selected = tab === activeTab;

                tab.setAttribute("aria-selected", String(selected));
                tab.tabIndex = selected ? 0 : -1;
            });

            panels.forEach((panel) => {
                panel.hidden = panel !== activePanel;
            });

            if (moveFocus) {
                activeTab.focus();
            }

            /*    activeTab.scrollIntoView({
                   behavior: prefersReducedMotion ? "auto" : "smooth",
                   block: "nearest",
                   inline: "center"
               }); */

            if (updateHash) {
                history.replaceState(
                    null,
                    "",
                    `#${activePanel.id}`
                );
            }

            /*
 * Centre the capsule horizontally without allowing
 * scrollIntoView() to move the page vertically.
 */
            const tabList = activeTab.closest(".essentials-tabs");

            if (
                tabList &&
                tabList.scrollWidth > tabList.clientWidth
            ) {
                const tabRect = activeTab.getBoundingClientRect();
                const listRect = tabList.getBoundingClientRect();

                const left =
                    tabList.scrollLeft +
                    tabRect.left -
                    listRect.left -
                    (listRect.width - tabRect.width) / 2;

                tabList.scrollTo({
                    left,
                    behavior: prefersReducedMotion ? "auto" : "smooth"
                });
            }

            if (scrollToPanel) {
                requestAnimationFrame(() => {
                    const nav =
                        document.querySelector(".essentials-nav");

                    const navHeight =
                        nav?.getBoundingClientRect().height || 58;

                    const switcherTop =
                        switcher.getBoundingClientRect().top +
                        window.scrollY -
                        navHeight;

                    window.scrollTo({
                        top: switcherTop,
                        behavior: prefersReducedMotion
                            ? "auto"
                            : "smooth"
                    });
                });
            }
        };

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => {
                activateTab(tab, {
                    updateHash: true,
                    scrollToPanel: true
                });
            });

            tab.addEventListener("keydown", (event) => {
                let nextIndex = index;

                if (event.key === "ArrowRight") {
                    nextIndex = (index + 1) % tabs.length;
                } else if (event.key === "ArrowLeft") {
                    nextIndex = (index - 1 + tabs.length) % tabs.length;
                } else if (event.key === "Home") {
                    nextIndex = 0;
                } else if (event.key === "End") {
                    nextIndex = tabs.length - 1;
                } else {
                    return;
                }

                event.preventDefault();

                activateTab(tabs[nextIndex], {
                    updateHash: true,
                    moveFocus: true,
                    scrollToPanel: true
                });
            });
        });

        const initialPanel = getPanelFromHash();
        const initialTab = getTabForPanel(initialPanel) || tabs[0];

        activateTab(initialTab);

        if (initialPanel) {
            requestAnimationFrame(() => {
                const target =
                    document.getElementById(window.location.hash.slice(1)) ||
                    initialPanel;

                target.scrollIntoView({
                    behavior: "auto",
                    block: "start"
                });
            });
        }

        window.addEventListener("hashchange", () => {
            const panel = getPanelFromHash();
            const tab = getTabForPanel(panel);

            if (tab) {
                activateTab(tab);
            }
        });
    }
})();
