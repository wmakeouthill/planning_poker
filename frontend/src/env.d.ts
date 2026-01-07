/// <reference types="@ngx-env/builder/env" />

interface ImportMetaEnv {
    readonly NG_APP_API_URL: string;
    readonly NG_APP_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
