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

    /*
     * Existing locally saved checklist
     */
    const checklistKey = "aegeanEssentialsChecklist:v1";

    const boxes = Array.from(
        document.querySelectorAll("[data-item]")
    );

    const feedback = document.querySelector("#checklist-feedback");
    const clearButton = document.querySelector("#clear-completed");
    const resetButton = document.querySelector("#reset-checklist");

    if (!boxes.length) {
        return;
    }

    let savedState = {};

    try {
        savedState =
            JSON.parse(localStorage.getItem(checklistKey)) || {};
    } catch {
        savedState = {};
    }

    const checkedCount = () => {
        return boxes.filter((box) => box.checked).length;
    };

    const announceCount = () => {
        if (!feedback) {
            return;
        }

        feedback.textContent = "";
        /*   `${checkedCount()} of ${boxes.length} essentials checked.`; */
    };

    const saveChecklist = () => {
        const state = Object.fromEntries(
            boxes.map((box) => [
                box.dataset.item,
                box.checked
            ])
        );

        try {
            localStorage.setItem(
                checklistKey,
                JSON.stringify(state)
            );
        } catch {
            if (feedback) {
                feedback.textContent =
                    "The checklist could not be saved on this device.";
            }
        }
    };

    boxes.forEach((box) => {
        box.checked = savedState[box.dataset.item] === true;

        box.addEventListener("change", () => {
            saveChecklist();
            announceCount();
        });
    });

    clearButton?.addEventListener("click", () => {
        const completed = boxes.filter((box) => box.checked);

        if (!completed.length) {
            if (feedback) {
                feedback.textContent =
                    "Nothing completed to clear yet.";
            }

            return;
        }

        completed.forEach((box) => {
            box.checked = false;
        });

        saveChecklist();

        if (feedback) {
            feedback.textContent =
                "Completed items cleared.";
        }
    });

    resetButton?.addEventListener("click", () => {
        const confirmed = window.confirm(
            "Reset the entire essentials checklist on this device?"
        );

        if (!confirmed) {
            return;
        }

        boxes.forEach((box) => {
            box.checked = false;
        });

        localStorage.removeItem(checklistKey);

        if (feedback) {
            feedback.textContent =
                "Checklist reset on this device.";
        }
    });

    announceCount();
})();
