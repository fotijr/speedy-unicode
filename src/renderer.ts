import { ipcRenderer as icp } from 'electron';
import { html, render } from 'uhtml';
import { IcpChannels } from './constants';
import { ScoredResult, UnicodeCharacter } from './models';

const maxResults = 100;
const searchBox = document.getElementById('search') as HTMLInputElement;
const contextMenu: HTMLElement = document.getElementById('context-menu');

/**
 * Selection made window flashes a confirmation message
 * Turned off for now because it delays the user's focus being returned to previous application
 */
const showSelectionMade = false;

let characters: UnicodeCharacter[] = [];
let filteredResults: UnicodeCharacter[] = [];
let lastSearch = '';
let selectedRowIndex = 0;

const setFocus = () => {
    searchBox.focus();
}

const initializeWindow = () => {
    // void loadCharacters();
    icp.send(IcpChannels.loadUnicodes);
    searchBox.addEventListener('keydown', preserveCursorPosition, false);
    searchBox.addEventListener('keypress', preserveCursorPosition, false);
    searchBox.onblur = setFocus;
    setFocus();
}

initializeWindow();

/** Prevent browser from moving cursor to start/end on arrow press */
const preserveCursorPosition = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        return false;
    }
}

searchBox.onkeydown = (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowUp') {
        setSelectedRow(selectedRowIndex - 1);
        return;
    }
    if (ev.key === 'ArrowDown') {
        setSelectedRow(selectedRowIndex + 1);
        return;
    }
    if (ev.key === 'Escape') {
        window.close();
        searchBox.select();
        return;
    }
    if (ev.key === 'Enter' && filteredResults[selectedRowIndex]) {
        const selected = getSelectedUnicode();
        void selectUnicode(selected);
        return;
    }
};

searchBox.onkeyup = (ev: KeyboardEvent) => {
    const searchTerm = (ev.target as HTMLInputElement).value;
    searchUnicodeCharacters(searchTerm);
};

const getSelectedUnicode = (): UnicodeCharacter => {
    return characters.find(c => c.code === filteredResults[selectedRowIndex].code);
}

/**
 * Search unicode characters
 * @param searchTerm Term to search for
 * @param force If `true`, search will be performed even if it was the same as previous search
 */
const searchUnicodeCharacters = (searchTerm: string, force = false) => {
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
 * 
 * @param searchTerm Search term to use (case-insensitive search)
 */
const getFilteredCharacters = (searchTerm: string) => {
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
    icp.send(IcpChannels.editCharacter, selectedChar);
};

document.getElementById('delete').onclick = async (event: MouseEvent) => {
    const selectedChar = getSelectedUnicode();
    if (!selectedChar) {
        // don't do anything if no character selected
        // this can happen when second delete attempted before list refreshed
        return;
    }
    // refresh filtered list after character deleted
    searchUnicodeCharacters(searchBox.value, true);
};

icp.on(IcpChannels.unicdoesLoaded, (e, chars: UnicodeCharacter[]) => {
    characters = chars;
});

const rowSelected = async (char: UnicodeCharacter, rowIndex: number) => {
    setSelectedRow(rowIndex);
    await selectUnicode(char);
    setFocus();
}

const showContextMenu = (char: UnicodeCharacter, rowIndex: number, ev: PointerEvent) => {
    setSelectedRow(rowIndex);
    if (char.userDefined) {
        document.getElementById('delete-controls').classList.remove('hide');
    } else {
        document.getElementById('delete-controls').classList.add('hide');
    }
    contextMenu.style.top = `${ev.y - 15}px`;
    contextMenu.style.left = `${ev.x - 15}px`;
    contextMenu.classList.add('show');
    setTimeout(() => {
        contextMenu.classList.remove('show');
    }, 100);
}

const renderCharacters = (chars: UnicodeCharacter[]) => {
    render(document.getElementById('char-container'), () => html`
    <table>
        <tbody>${chars.map((c, i) => html.for(c, c.code)`
            <tr id=${i} onclick=${rowSelected(c, i)} oncontextmenu=${showContextMenu.bind(null, c, i)}>
                <td class="unicode">${c.value}</td>
                <td>${c.name}</td>
            </tr>
            `)}
        </tbody>
    </table>
    `);
}

const setSelectedRow = (index: number) => {
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

const selectUnicode = async (unicode: UnicodeCharacter): Promise<void> => {
    try {
        unicode.lastSelected = new Date().getTime();
        await navigator.clipboard.writeText(unicode.value);
        if (showSelectionMade) {
            icp.send('selection-made', unicode);
        }
        searchBox.value = '';
        window.close();
        searchUnicodeCharacters('');
        setSelectedRow(0);
    } catch (error) {
        console.error('Failed to select unicode', unicode, error);
    }
}
