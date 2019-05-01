import { app, remote } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { UnicodeCharacter } from '../models';

export class UnicodeStore {
    private userDefinedCharactersPath: string;
    private readonly standardUnicodePath = path.join(__dirname, '..', 'assets', 'unicode-data.txt');
    private userDefinedCharacters: UnicodeCharacter[] = [
        { value: `¯\\_(ツ)_/¯`, name: 'Shrug', number: 'ascii-shrug', lastSelected: 0, userDefined: true },
        {
            alias: 'LOD', lastSelected: 0, name: 'Look of Disapproval',
            number: 'ascii-lod', userDefined: true, value: 'ಠ_ಠ'
        }
    ];
    constructor() {
        const fileName = 'user-characters.json';
        const userDataPath = (app || remote.app).getPath('userData');
        this.userDefinedCharactersPath = path.join(userDataPath, fileName);
    }

    public async loadData(): Promise<UnicodeCharacter[]> {
        try {
            const standardCharacters = await this.loadStandardCharacters();
            const userDefinedCharacters = await this.loadUserDefinedCharacters();
            userDefinedCharacters.forEach(c => {
                const existingIndex = standardCharacters.findIndex(sc => sc.number === c.number);
                if (existingIndex >= 0) {
                    // standard character is overridden by user defined chars so delete it before combining
                    standardCharacters.splice(existingIndex, 1);
                }
            });
            const allCharacters = [
                ...standardCharacters,
                ...userDefinedCharacters
            ];
            return allCharacters;
        } catch (error) {
            console.error(error);
        }
    }

    public async saveUserDefinedCharacter(character: UnicodeCharacter) {
        const existingIndex = this.userDefinedCharacters.findIndex(c => c.number === character.number);
        if (existingIndex >= 0) {
            this.userDefinedCharacters[existingIndex] = character;
        } else {
            this.userDefinedCharacters.push(character);
        }
        await this.saveUserDefinedFile();
    }

    public async deleteUserDefinedCharacter(character: UnicodeCharacter) {
        const existingIndex = this.userDefinedCharacters.findIndex(c => c.number === character.number);
        if (existingIndex >= 0) {
            this.userDefinedCharacters.splice(existingIndex, 1);
            await this.saveUserDefinedFile();
        }
        await this.saveUserDefinedFile();
    }

    private async saveUserDefinedFile() {
        await fs.promises.writeFile(this.userDefinedCharactersPath, JSON.stringify(this.userDefinedCharacters));
    }

    private async loadStandardCharacters(): Promise<UnicodeCharacter[]> {
        const unicodeData = await fs.promises.readFile(this.standardUnicodePath, 'utf-8') as string;
        const fileLines = unicodeData.split(/\r?\n/);
        const characters: UnicodeCharacter[] = [];
        fileLines.forEach(line => {
            try {
                const properties = line.split(';');
                if (properties.length < 2 || properties[2] === 'Cs') {
                    // not a usable unicode char
                    return;
                }
                characters.push({
                    lastSelected: 0,
                    name: this.formatName(properties[1]),
                    number: properties[0],
                    value: String.fromCodePoint(parseInt(properties[0], 16))
                });
            } catch (error) {
                console.error('Parse failed.', error, line);
            }
        });
        return characters;
    }

    private async loadUserDefinedCharacters(): Promise<UnicodeCharacter[]> {
        try {
            const fileContents = await fs.promises.readFile(this.userDefinedCharactersPath, 'utf-8') as string;
            this.userDefinedCharacters = JSON.parse(fileContents);
        } catch (error) {
            console.error('Error loading user-defined unicode characters', error);
        }
        return this.userDefinedCharacters;
    }

    private formatName(name: string): string {
        return name[0] + name.slice(1).toLocaleLowerCase();
    }

}
