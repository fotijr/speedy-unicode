import { ipcRenderer } from 'electron';
import { html, render } from 'lighterhtml-plus';
import { editCharacterChannel, saveCharacterChannel } from './constants';
import { ScoredResult, UnicodeCharacter } from './models';
import { UnicodeStore } from './store/unicode-store';

const unicodeStore = new UnicodeStore();
const maxResults = 100;
const searchBox = document.getElementById('search') as HTMLInputElement;
const contextMenu = document.getElementById('context-menu') as HTMLElement;

/**
 * Selection made window flashes a confirmation message
 * Turned off for now because it delays the user's focus being returned to previous application
 */
const showSelectionMade = false;

let characters: UnicodeCharacter[] = [];
let filteredResults: UnicodeCharacter[] = [];
let lastSearch = '';
let selectedRowIndex = 0;

initializeWindow();

function initializeWindow() {
    loadCharacters();
    searchBox.addEventListener('keydown', preserveCursorPosition, false);
    searchBox.addEventListener('keypress', preserveCursorPosition, false);
    searchBox.onblur = setFocus;
    setFocus();
}

function setFocus() {
    searchBox.focus();
}

/** Prevent browser from moving cursor to start/end on arrow press */
function preserveCursorPosition(e: KeyboardEvent) {
    if (e.keyCode === 38 || e.keyCode === 40) {
        e.preventDefault();
        return false;
    }
}

searchBox.onkeydown = (ev: KeyboardEvent) => {
    if (ev.keyCode === 38) {
        // up arrow
        setSelectedRow(selectedRowIndex - 1);
        return;
    }
    if (ev.keyCode === 40) {
        // down arrow
        setSelectedRow(selectedRowIndex + 1);
        return;
    }
    if (ev.keyCode === 27) {
        // escape key
        window.close();
        searchBox.select();
        return;
    }
    if (ev.keyCode === 13 && filteredResults[selectedRowIndex]) {
        // enter key
        const selected = getSelectedUnicode();
        selectUnicode(selected);
        return;
    }
};

searchBox.onkeyup = async (ev: KeyboardEvent) => {
    const searchTerm = (ev.srcElement as HTMLInputElement).value;
    searchUnicodeCharacters(searchTerm);
};

function getSelectedUnicode(): UnicodeCharacter {
    return characters.find(c => c.number === filteredResults[selectedRowIndex].number);
}

/**
 * Search unicode characters
 * @param searchTerm Term to search for
 * @param force If `true`, search will be performed even if it was the same as previous search
 */
function searchUnicodeCharacters(searchTerm: string, force: boolean = false) {
    if (!force && lastSearch === searchTerm) {
        return;
    }
    filteredResults = getFilteredCharacters(searchTerm);
    renderCharacters(filteredResults);
    setSelectedRow(selectedRowIndex);
    lastSearch = searchTerm;
}

/**
 * Filter unicode by search term.
 * If search term empty, returns recently used unicode characters.
 * @param searchTerm Search term to use (case-insensitive search)
 */
function getFilteredCharacters(searchTerm: string): UnicodeCharacter[] {
    if (!searchTerm) {
        // if search criteria empty, show recently used characters
        const previouslyUsed = characters.filter(c => c.lastSelected);
        previouslyUsed.sort((a, b) => b.lastSelected - a.lastSelected);
        return previouslyUsed;

    }
    const nameRegex = new RegExp(searchTerm, 'i');
    let results: ScoredResult[] = characters.reduce((chars: ScoredResult[], char: UnicodeCharacter) => {
        let score = 1000;
        if (nameRegex.test(char.name)) {
            score = (char.name.length - searchTerm.length);
        }
        if (char.alias && nameRegex.test(char.alias)) {
            // alias matches get an extra deduction to be weighted over name matches
            score = Math.min(score, ((char.alias.length - searchTerm.length) - 1));
        }

        // if score was less than 1000, a match was found
        if (score < 1000) {
            if (char.userDefined) {
                // user defined chars get an extra deduction to weight them over standard chars
                score -= 1;
            }
            const match: ScoredResult = {
                ...char,
                score
            };
            chars.push(match);
        }
        return chars;
    }, []);

    // sort results
    results.sort((a, b) => a.score - b.score);

    // limit results
    if (results.length > maxResults) {
        results = results.slice(0, maxResults);
    }
    return results;
}

document.getElementById('edit').onclick = (event: MouseEvent) => {
    const selectedChar = getSelectedUnicode();
    ipcRenderer.send(editCharacterChannel, selectedChar);
};

document.getElementById('delete').onclick = async (event: MouseEvent) => {
    const selectedChar = getSelectedUnicode();
    if (!selectedChar) {
        // don't do anything if no character selected
        // this can happen when second delete attempted before list refreshed
        return;
    }
    await unicodeStore.deleteUserDefinedCharacter(selectedChar);
    await loadCharacters();
    // refresh filtered list after character deleted
    searchUnicodeCharacters(searchBox.value, true);
};

ipcRenderer.on(saveCharacterChannel, async (event: any, editCharacter: UnicodeCharacter) => {
    await unicodeStore.saveUserDefinedCharacter(editCharacter);
    loadCharacters();
});

/** Load unicode characters from file */
function loadCharacters() {
    return unicodeStore.loadData()
        .then(c => {
            characters = c;
        });
}

function renderCharacters(chars: UnicodeCharacter[]) {
    render(document.getElementById('char-container'), () => html`
    <table>
        <tbody>${chars.map((c, i) => html`
            <tr id=${i} onclick=${select} oncontextmenu=${showContextMenu}>
                <td class="unicode">${c.value}</td>
                <td>${c.name}</td>
            </tr>
            `)}
        </tbody>
    </table>
    `);

    async function select(e: any) {
        const trNode: HTMLElement = e.path.find((n: any) => n.nodeName === 'TR');
        const selectedIndex = parseInt(trNode.id, 10);
        setSelectedRow(selectedIndex);
        await selectUnicode(getSelectedUnicode());
        setFocus();
    }

    function showContextMenu(event: MouseEvent) {
        setSelectedRowByMouseEvent(event);
        const selectedUnicode = getSelectedUnicode();
        if (selectedUnicode.userDefined) {
            document.getElementById('delete-controls').classList.remove('hide');
        } else {
            document.getElementById('delete-controls').classList.add('hide');
        }
        contextMenu.style.top = `${event.y - 15}px`;
        contextMenu.style.left = `${event.x - 15}px`;
        contextMenu.classList.add('show');
        setTimeout(() => {
            contextMenu.classList.remove('show');
        }, 100);
    }
}

function setSelectedRowByMouseEvent(e: any) {
    const trNode: HTMLElement = e.path.find((n: any) => n.nodeName === 'TR');
    const selectedIndex = parseInt(trNode.id, 10);
    setSelectedRow(selectedIndex);
}

function setSelectedRow(index: number) {
    if (index < 0 || index >= filteredResults.length) {
        // current selection already at top or bottom, do nothing
        return;
    }
    selectedRowIndex = index;
    const selectedRows = document.querySelectorAll('tr.selected');
    selectedRows.forEach(el => {
        el.classList.remove('selected');
    });
    const selectedRow = document.getElementById(index.toString());
    selectedRow.classList.add('selected');
    selectedRow.scrollIntoView({
        behavior: 'smooth'
    });
}

async function selectUnicode(unicode: UnicodeCharacter) {
    try {
        unicode.lastSelected = new Date().getTime();
        await navigator.clipboard.writeText(unicode.value);
        if (showSelectionMade) {
            ipcRenderer.send('selection-made', unicode);
        }
        searchBox.value = '';
        window.close();
        searchUnicodeCharacters('');
        setSelectedRow(0);
    } catch (error) {
        console.error('Failed to select unicode', unicode, error);
    }
}
