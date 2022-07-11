interface DataEntry {
    id?: number,
    provider: string,
    url: string,
    data: { [key: string]: string; },
    added_at: Date,
    updated_at: Date
}

export default DataEntry;
