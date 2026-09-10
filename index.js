"use strict";

/* ========================================
   VEJR
======================================== */

const weather_info = document.querySelector(".weather_info");

let weather = {
    rain: 0,
    showers: 0,
    weatherCode: 0,
    temperature: 0,
    loaded: false
};

function getWeather() {
    if (!navigator.geolocation) {
        weather_info.textContent = "GPS understøttes ikke.";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            const apiUrl =
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_gusts_10m,wind_speed_10m,is_day,precipitation,rain,showers,weather_code,snowfall,cloud_cover`;

            fetch(apiUrl)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Kunne ikke hente vejrdata");
                    }

                    return response.json();
                })
                .then((data) => {
                    console.log("Vejrdata:", data);

                    weather.temperature = data.current.temperature_2m;
                    weather.rain = data.current.rain;
                    weather.showers = data.current.showers;
                    weather.weatherCode = data.current.weather_code;
                    weather.loaded = true;

                    weather_info.textContent =
                        `${getWeatherText(weather.weatherCode)} ${weather.temperature}°C`;

                    renderTasks();
                })
                .catch((error) => {
                    console.error("Fejl ved hentning af vejr:", error);
                    weather_info.textContent = "Kunne ikke hente vejret.";
                });
        },
        () => {
            weather_info.textContent = "Kunne ikke få din placering.";
        }
    );
}

function getWeatherText(code) {
    if (code === 0) return " Klart";
    if (code >= 1 && code <= 3) return " Skyet";
    if (code >= 51 && code <= 57) return " Støvregn";
    if (code >= 61 && code <= 67) return " Regn";
    if (code >= 71 && code <= 77) return " Sne";
    if (code >= 80 && code <= 82) return " Regnbyger";
    if (code >= 85 && code <= 86) return " Snebyger";
    if (code >= 95 && code <= 99) return " Tordenvejr";

    return " Ukendt vejr";
}

function getTaskWeatherStatus(task) {
    if (!task.outdoor) {
        return {
            possible: true,
            text: ""
        };
    }

    if (!weather.loaded) {
        return {
            possible: null,
            text: " Tjekker vejret..."
        };
    }

    if (weather.weatherCode >= 95 && weather.weatherCode <= 99) {
        return {
            possible: false,
            text: " Kan ikke udføres lige nu – tordenvejr"
        };
    }

    if (
        weather.rain > 0 ||
        weather.showers > 0 ||
        (weather.weatherCode >= 51 && weather.weatherCode <= 67) ||
        (weather.weatherCode >= 80 && weather.weatherCode <= 82)
    ) {
        return {
            possible: false,
            text: "Kan ikke udføres lige nu – det regner"
        };
    }

    return {
        possible: true,
        text: "Kan udføres – vejret er fint"
    };
}

/* ========================================
   TASKS
======================================== */

const task_input = document.querySelector(".task_text");
const outdoor_input = document.querySelector(".outdoor_task");
const task_date = document.querySelector(".task_date");
const createTask_btn = document.querySelector(".create_task");
const tasks_ul = document.querySelector(".tasks");

let task_arr = JSON.parse(localStorage.getItem("tasks")) || [];

// Sørger for at tasks får et note-felt
task_arr.forEach((task) => {
    if (task.note === undefined) {
        task.note = "";
    }
});

createTask_btn.addEventListener("click", createTask);

task_input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        createTask();
    }
});

function createTask() {
    if (task_input.value.trim() === "") {
        return;
    }

    const task_obj = {
        id: self.crypto.randomUUID(),
        taskTxt: task_input.value.trim(),
        taskDone: false,
        outdoor: outdoor_input.checked,
        date: task_date.value,
        note: ""
    };

    task_arr.push(task_obj);

    localStorage.setItem(
        "tasks",
        JSON.stringify(task_arr)
    );

    task_input.value = "";
    outdoor_input.checked = false;
    task_date.value = "";

    renderTasks();
}

function renderTasks() {
    tasks_ul.innerHTML = "";

    task_arr.forEach((task) => {
        const li = document.createElement("li");

        const weatherStatus = getTaskWeatherStatus(task);

        let statusClass = "";

        if (weatherStatus.possible === true) {
            statusClass = "task-available";
        }

        if (weatherStatus.possible === false) {
            statusClass = "task-unavailable";
        }

        if (weatherStatus.possible === null) {
            statusClass = "task-checking";
        }

        li.innerHTML = `
            <input
                type="checkbox"
                class="task-checkbox"
                ${task.taskDone ? "checked" : ""}
            >

            <span>${task.taskTxt}</span>

            <span>
                ${task.outdoor ? "🏞 Udendørs" : "🏠︎ Indendørs"}
            </span>

            ${
                task.date
                    ? `<span>Dato: ${task.date}</span>`
                    : ""
            }

            ${
                weatherStatus.text
                    ? `
                        <span class="${statusClass}">
                            ${weatherStatus.text}
                        </span>
                    `
                    : ""
            }

            <button class="note-task">
                 Note
            </button>

            <button class="edit-task">
                Ret
            </button>

            <button class="delete-task">
                Slet
            </button>
        `;

        /* --------------------------------
           CHECKBOX
        -------------------------------- */

        const checkbox = li.querySelector(".task-checkbox");

        checkbox.addEventListener("click", (e) => {
            e.preventDefault();

            task.taskDone = !task.taskDone;

            localStorage.setItem(
                "tasks",
                JSON.stringify(task_arr)
            );

            renderTasks();
        });

        /* --------------------------------
           NOTE
        -------------------------------- */

        const noteBtn = li.querySelector(".note-task");

        noteBtn.addEventListener("click", () => {
            const note = prompt(
                "Skriv en note til denne task:",
                task.note
            );

            if (note !== null) {
                task.note = note.trim();

                localStorage.setItem(
                    "tasks",
                    JSON.stringify(task_arr)
                );

                renderTasks();
            }
        });

        /* --------------------------------
           REDIGER TASK
        -------------------------------- */

        const editBtn = li.querySelector(".edit-task");

        editBtn.addEventListener("click", () => {
            const newText = prompt(
                "Rediger task:",
                task.taskTxt
            );

            if (
                newText === null ||
                newText.trim() === ""
            ) {
                return;
            }

            const newDate = prompt(
                "Rediger dato (YYYY-MM-DD):",
                task.date
            );

            if (newDate === null) {
                return;
            }

            const newOutdoor = confirm(
                "Skal tasken udføres udendørs?\n\nOK = Udendørs\nAnnuller = Indendørs"
            );

            task.taskTxt = newText.trim();
            task.date = newDate;
            task.outdoor = newOutdoor;

            localStorage.setItem(
                "tasks",
                JSON.stringify(task_arr)
            );

            renderTasks();
        });

        /* --------------------------------
           SLET TASK
        -------------------------------- */

        const deleteBtn = li.querySelector(".delete-task");

        deleteBtn.addEventListener("click", () => {
            const index = task_arr.findIndex(
                (item) => item.id === task.id
            );

            if (index !== -1) {
                task_arr.splice(index, 1);
            }

            localStorage.setItem(
                "tasks",
                JSON.stringify(task_arr)
            );

            renderTasks();
        });

        /* --------------------------------
           VIS KUN 30 TEGN AF NOTE
        -------------------------------- */

        if (task.note) {
            const note_text = document.createElement("p");

            note_text.classList.add("task-note");

            const shortNote =
                task.note.length > 30
                    ? task.note.substring(0, 30) + "..."
                    : task.note;

            note_text.textContent = `📝 ${shortNote}`;

            li.appendChild(note_text);
        }

        tasks_ul.appendChild(li);
    });
}

/* ========================================
   LISTER
======================================== */

const list_input = document.querySelector(".list_name");
const createList_btn = document.querySelector(".create_list");
const lists_ul = document.querySelector(".lists");

let list_arr = JSON.parse(localStorage.getItem("lists")) || [];

// Sørger for at gamle lister/items får note-felt
list_arr.forEach((list) => {
    if (!list.items) {
        list.items = [];
    }

    list.items.forEach((item) => {
        if (item.note === undefined) {
            item.note = "";
        }
    });
});

createList_btn.addEventListener("click", createList);

list_input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        createList();
    }
});

function createList() {
    if (list_input.value.trim() === "") {
        return;
    }

    const list_obj = {
        id: self.crypto.randomUUID(),
        name: list_input.value.trim(),
        items: []
    };

    list_arr.push(list_obj);

    localStorage.setItem(
        "lists",
        JSON.stringify(list_arr)
    );

    list_input.value = "";

    renderLists();
}

/* ========================================
   VIS LISTER
======================================== */

function renderLists() {
    lists_ul.innerHTML = "";

    list_arr.forEach((list) => {
        const li = document.createElement("li");

        li.innerHTML = `
            <h2>${list.name}</h2>

            <input
                type="text"
                class="item-input"
                placeholder="Tilføj indhold..."
            >

            <input
                type="date"
                class="item-date"
            >

            <button class="add-item">
                Tilføj item
            </button>

            <button class="edit-list">
                Ret liste
            </button>

            <button class="delete-list">
                Slet liste
            </button>
        `;

        const itemInput = li.querySelector(".item-input");
        const itemDate = li.querySelector(".item-date");
        const addItemBtn = li.querySelector(".add-item");

        /* --------------------------------
           TILFØJ ITEM
        -------------------------------- */

        function addItem() {
            if (itemInput.value.trim() === "") {
                return;
            }

            const item = {
                id: self.crypto.randomUUID(),
                text: itemInput.value.trim(),
                done: false,
                date: itemDate.value,
                note: ""
            };

            list.items.push(item);

            localStorage.setItem(
                "lists",
                JSON.stringify(list_arr)
            );

            itemInput.value = "";
            itemDate.value = "";

            renderLists();
        }

        addItemBtn.addEventListener(
            "click",
            addItem
        );

        /* --------------------------------
           ENTER OPRETTER ITEM
        -------------------------------- */

        itemInput.addEventListener(
            "keydown",
            (e) => {
                if (e.key === "Enter") {
                    addItem();
                }
            }
        );

        /* --------------------------------
           REDIGER LISTE
        -------------------------------- */

        const editListBtn =
            li.querySelector(".edit-list");

        editListBtn.addEventListener(
            "click",
            () => {
                const newName = prompt(
                    "Nyt navn på listen:",
                    list.name
                );

                if (
                    newName !== null &&
                    newName.trim() !== ""
                ) {
                    list.name = newName.trim();

                    localStorage.setItem(
                        "lists",
                        JSON.stringify(list_arr)
                    );

                    renderLists();
                }
            }
        );

        /* --------------------------------
           SLET LISTE
        -------------------------------- */

        const deleteListBtn =
            li.querySelector(".delete-list");

        deleteListBtn.addEventListener(
            "click",
            () => {
                const index = list_arr.findIndex(
                    (item) => item.id === list.id
                );

                if (index !== -1) {
                    list_arr.splice(index, 1);
                }

                localStorage.setItem(
                    "lists",
                    JSON.stringify(list_arr)
                );

                renderLists();
            }
        );

        /* --------------------------------
           LIST ITEMS
        -------------------------------- */

        const items_ul =
            document.createElement("ul");

        list.items.forEach((item) => {
            const item_li =
                document.createElement("li");

            item_li.innerHTML = `
                <input
                    type="checkbox"
                    class="item-checkbox"
                    ${item.done ? "checked" : ""}
                >

                <span>
                    ${item.text}
                </span>

                ${
                    item.date
                        ? `<span>Dato: ${item.date}</span>`
                        : ""
                }

                <button class="note-item">
                    Note
                </button>

                <button class="edit-item">
                    Ret
                </button>

                <button class="delete-item">
                    Slet
                </button>
            `;

            /* ----------------------------
               CHECKBOX
            ---------------------------- */

            const checkbox =
                item_li.querySelector(
                    ".item-checkbox"
                );

            checkbox.addEventListener(
                "click",
                (e) => {
                    e.preventDefault();

                    item.done = !item.done;

                    localStorage.setItem(
                        "lists",
                        JSON.stringify(list_arr)
                    );

                    renderLists();
                }
            );

            /* ----------------------------
               NOTE
            ---------------------------- */

            const noteBtn =
                item_li.querySelector(
                    ".note-item"
                );

            noteBtn.addEventListener(
                "click",
                () => {
                    const note = prompt(
                        "Skriv en note til dette item:",
                        item.note
                    );

                    if (note !== null) {
                        item.note = note.trim();

                        localStorage.setItem(
                            "lists",
                            JSON.stringify(list_arr)
                        );

                        renderLists();
                    }
                }
            );

            /* ----------------------------
               REDIGER ITEM
            ---------------------------- */

            const editItemBtn =
                item_li.querySelector(
                    ".edit-item"
                );

            editItemBtn.addEventListener(
                "click",
                () => {
                    const newText = prompt(
                        "Rediger item:",
                        item.text
                    );

                    if (
                        newText === null ||
                        newText.trim() === ""
                    ) {
                        return;
                    }

                    const newDate = prompt(
                        "Rediger dato (YYYY-MM-DD):",
                        item.date
                    );

                    if (newDate === null) {
                        return;
                    }

                    item.text = newText.trim();
                    item.date = newDate;

                    localStorage.setItem(
                        "lists",
                        JSON.stringify(list_arr)
                    );

                    renderLists();
                }
            );

            /* ----------------------------
               SLET ITEM
            ---------------------------- */

            const deleteItemBtn =
                item_li.querySelector(
                    ".delete-item"
                );

            deleteItemBtn.addEventListener(
                "click",
                () => {
                    const index =
                        list.items.findIndex(
                            (listItem) =>
                                listItem.id === item.id
                        );

                    if (index !== -1) {
                        list.items.splice(
                            index,
                            1
                        );
                    }

                    localStorage.setItem(
                        "lists",
                        JSON.stringify(list_arr)
                    );

                    renderLists();
                }
            );

            /* ----------------------------
               VIS KUN 30 TEGN AF NOTE
            ---------------------------- */

            if (item.note) {
                const note_text =
                    document.createElement("p");

                note_text.classList.add(
                    "item-note"
                );

                const shortNote =
                    item.note.length > 30
                        ? item.note.substring(0, 30) + "..."
                        : item.note;

                note_text.textContent =
                    `📝 ${shortNote}`;

                item_li.appendChild(note_text);
            }

            items_ul.appendChild(item_li);
        });

        li.appendChild(items_ul);
        lists_ul.appendChild(li);
    });
}

/* ========================================
   START APP
======================================== */

renderTasks();
renderLists();
getWeather();

/* Opdater vejret hvert 10. minut */

setInterval(
    getWeather,
    10 * 60 * 1000
);