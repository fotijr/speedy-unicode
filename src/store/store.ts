import { app, remote } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { StoreData } from '../models';

class Store {
    private data: StoreData;
    private path: string;

    constructor(storeName: string) {
        const userDataPath = (app || remote.app).getPath('userData');
        this.path = path.join(userDataPath, `${storeName}.json`);
        this.data = this.loadData(this.path);
    }

    public get(key: string): any {
        return this.data[key];
    }

    private loadData(file: string): StoreData {
        return JSON.parse(fs.readFileSync(file, 'utf-8') as string);
    }
}
