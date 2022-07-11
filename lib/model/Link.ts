enum LinkStatus {
    PROCESSED = 'PROCESSED',
    UNPROCESSED = 'UNPROCESSED',
    FAILED = 'FAILED'
}

interface Link {
    id?: number,
    provider: string
    url: string;
    status: LinkStatus;
    added_at?: Date;
    updated_at?: Date;
}

export {
  Link,
  LinkStatus,
};
