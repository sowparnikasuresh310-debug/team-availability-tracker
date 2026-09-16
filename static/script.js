let teamMembers = [];


// =====================================================
// STATUS INFORMATION
// =====================================================

const statusInfo = {

    available: {
        label: "Available",
        icon: "🟢",
        className: "status-available"
    },

    busy: {
        label: "Busy",
        icon: "🟡",
        className: "status-busy"
    },

    meeting: {
        label: "In a Meeting",
        icon: "🟣",
        className: "status-meeting"
    },

    leave: {
        label: "On Leave",
        icon: "🔵",
        className: "status-leave"
    },

    unavailable: {
        label: "Unavailable",
        icon: "🔴",
        className: "status-unavailable"
    }

};


// =====================================================
// LOAD USERS
// =====================================================

async function loadUsers() {

    const container =
        document.getElementById("teamContainer");

    if (!container) {
        return;
    }


    try {

        const response =
            await fetch("/api/users");


        if (!response.ok) {

            throw new Error(
                "Unable to load users"
            );

        }


        teamMembers =
            await response.json();


        renderUsers();

        updateStatistics();


    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div class="loading">
                Unable to load team members.
                Please refresh the page.
            </div>
        `;

    }

}


// =====================================================
// RENDER USERS
// =====================================================

function renderUsers() {

    const container =
        document.getElementById(
            "teamContainer"
        );


    if (!container) {
        return;
    }


    const searchInput =
        document.getElementById(
            "searchInput"
        );


    const statusFilter =
        document.getElementById(
            "statusFilter"
        );


    const roleFilter =
        document.getElementById(
            "roleFilter"
        );


    const search =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "all";


    const selectedRole =
        roleFilter
            ? roleFilter.value
            : "all";


    const filteredUsers =
        teamMembers.filter(user => {


            const matchesSearch =

                user.name
                    .toLowerCase()
                    .includes(search)

                ||

                user.role
                    .toLowerCase()
                    .includes(search)

                ||

                user.username
                    .toLowerCase()
                    .includes(search);


            const matchesStatus =

                selectedStatus === "all"

                ||

                user.status === selectedStatus;


            const matchesRole =

                selectedRole === "all"

                ||

                user.role === selectedRole;


            return (
                matchesSearch
                &&
                matchesStatus
                &&
                matchesRole
            );

        });


    if (filteredUsers.length === 0) {

        container.innerHTML = `
            <div class="loading">
                <div class="empty-icon">
                    🔍
                </div>

                <strong>
                    No members found
                </strong>

                <p>
                    Try changing your search or filters.
                </p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        filteredUsers
            .map(createUserCard)
            .join("");

}


// =====================================================
// CREATE USER CARD
// =====================================================

function createUserCard(user) {

    const info =
        statusInfo[user.status]
        || statusInfo.unavailable;


    const initials =
        user.name
            .split(" ")
            .map(word => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();


    const canChangeStatus =
        currentUserCanEdit(user);


    const updated =
        formatDate(user.last_updated);


    return `

        <div class="team-card">

            <div class="card-top">

                <div class="avatar">

                    ${initials}

                </div>


                <span class="role-badge">

                    ${user.role}

                </span>

            </div>


            <div class="user-details">

                <h3>
                    ${escapeHTML(user.name)}
                </h3>

                <p>
                    @${escapeHTML(user.username)}
                </p>

            </div>


            <div class="status-area">

                <div class="current-status">

                    <span class="status-icon">

                        ${info.icon}

                    </span>

                    <div>

                        <strong class="${info.className}">

                            ${info.label}

                        </strong>

                        <small>

                            Updated ${updated}

                        </small>

                    </div>

                </div>


                <div class="status-selector">

                    <select
                        class="status-select ${info.className}"
                        ${canChangeStatus ? "" : "disabled"}
                        onchange="
                            changeStatus(
                                ${user.id},
                                this.value
                            )
                        "
                    >

                        <option
                            value="available"
                            ${user.status === "available" ? "selected" : ""}
                        >
                            🟢 Available
                        </option>

                        <option
                            value="busy"
                            ${user.status === "busy" ? "selected" : ""}
                        >
                            🟡 Busy
                        </option>

                        <option
                            value="meeting"
                            ${user.status === "meeting" ? "selected" : ""}
                        >
                            🟣 In a Meeting
                        </option>

                        <option
                            value="leave"
                            ${user.status === "leave" ? "selected" : ""}
                        >
                            🔵 On Leave
                        </option>

                        <option
                            value="unavailable"
                            ${user.status === "unavailable" ? "selected" : ""}
                        >
                            🔴 Unavailable
                        </option>

                    </select>

                </div>

            </div>

        </div>

    `;

}


// =====================================================
// CHECK PERMISSION
// =====================================================

function currentUserCanEdit(user) {

    const currentUsername =
        document.body.dataset.username;


    const currentRole =
        document.body.dataset.role;


    if (currentRole === "admin") {
        return true;
    }


    return (
        currentUsername === user.username
    );

}


// =====================================================
// CHANGE STATUS
// =====================================================

async function changeStatus(
    userId,
    newStatus
) {

    try {

        const response =
            await fetch(
                `/api/users/${userId}/status`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );


        const result =
            await response.json();


        if (
            !response.ok
            ||
            !result.success
        ) {

            throw new Error(
                result.message
                ||
                "Status update failed."
            );

        }


        const index =
            teamMembers.findIndex(
                user =>
                    user.id === userId
            );


        if (index !== -1) {

            teamMembers[index] =
                result.user;

        }


        renderUsers();

        updateStatistics();


        showToast(
            `${result.user.name} is now ${
                statusInfo[
                    result.user.status
                ].label
            }`,
            "success"
        );


    } catch (error) {

        console.error(error);

        showToast(
            error.message,
            "error"
        );

        loadUsers();

    }

}


// =====================================================
// STATISTICS
// =====================================================

function updateStatistics() {

    const total =
        teamMembers.length;


    const available =
        teamMembers.filter(
            user =>
                user.status === "available"
        ).length;


    const busy =
        teamMembers.filter(
            user =>
                user.status === "busy"
                ||
                user.status === "meeting"
        ).length;


    const away =
        teamMembers.filter(
            user =>
                user.status === "leave"
                ||
                user.status === "unavailable"
        ).length;


    const totalElement =
        document.getElementById(
            "totalMembers"
        );


    const availableElement =
        document.getElementById(
            "availableMembers"
        );


    const busyElement =
        document.getElementById(
            "busyMembers"
        );


    const awayElement =
        document.getElementById(
            "awayMembers"
        );


    if (totalElement) {

        animateNumber(
            totalElement,
            total
        );

    }


    if (availableElement) {

        animateNumber(
            availableElement,
            available
        );

    }


    if (busyElement) {

        animateNumber(
            busyElement,
            busy
        );

    }


    if (awayElement) {

        animateNumber(
            awayElement,
            away
        );

    }

}


// =====================================================
// NUMBER ANIMATION
// =====================================================

function animateNumber(
    element,
    target
) {

    const start =
        parseInt(element.textContent)
        || 0;


    if (start === target) {
        element.textContent = target;
        return;
    }


    const duration = 400;

    const startTime =
        performance.now();


    function update(currentTime) {

        const progress =
            Math.min(
                (currentTime - startTime)
                / duration,
                1
            );


        const value =
            Math.round(
                start +
                (target - start)
                * progress
            );


        element.textContent =
            value;


        if (progress < 1) {

            requestAnimationFrame(
                update
            );

        }

    }


    requestAnimationFrame(
        update
    );

}


// =====================================================
// TOAST
// =====================================================

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.className =
        `toast show ${type}`;


    setTimeout(() => {

        toast.className =
            "toast";

    }, 2800);

}


// =====================================================
// SEARCH + FILTERS
// =====================================================

const searchInput =
    document.getElementById(
        "searchInput"
    );


if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderUsers
    );

}


const statusFilter =
    document.getElementById(
        "statusFilter"
    );


if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        renderUsers
    );

}


const roleFilter =
    document.getElementById(
        "roleFilter"
    );


if (roleFilter) {

    roleFilter.addEventListener(
        "change",
        renderUsers
    );

}


// =====================================================
// DARK MODE
// =====================================================

const themeToggle =
    document.getElementById(
        "themeToggle"
    );


if (themeToggle) {

    const savedTheme =
        localStorage.getItem(
            "theme"
        );


    if (savedTheme === "dark") {

        document.body.classList.add(
            "dark-mode"
        );

        themeToggle.textContent =
            "☀️";

    }


    themeToggle.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark-mode"
            );


            const dark =
                document.body.classList.contains(
                    "dark-mode"
                );


            localStorage.setItem(
                "theme",
                dark ? "dark" : "light"
            );


            themeToggle.textContent =
                dark ? "☀️" : "🌙";

        }
    );

}


// =====================================================
// DATE FORMAT
// =====================================================

function formatDate(dateString) {

    if (!dateString) {
        return "recently";
    }


    const date =
        new Date(
            dateString.replace(" ", "T")
        );


    if (isNaN(date)) {
        return "recently";
    }


    const now =
        new Date();


    const seconds =
        Math.floor(
            (now - date) / 1000
        );


    if (seconds < 60) {

        return "just now";

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {

        return `${minutes}m ago`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return `${hours}h ago`;

    }


    return date.toLocaleDateString();

}


// =====================================================
// SECURITY - HTML ESCAPE
// =====================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =====================================================
// START
// =====================================================

loadUsers();