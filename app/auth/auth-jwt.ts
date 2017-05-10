/**
 * Created by bwang on 2017/5/10.
 */
import {
    Http,
    Headers,
    Request,
    RequestOptions,
    RequestOptionsArgs,
    RequestMethod,
    Response,
    HttpModule
} from "@angular/http";
import {Injectable, Provider, NgModule, Optional, SkipSelf, ModuleWithProviders} from "@angular/core";
import {Observable} from "rxjs/Observable";
import "rxjs/add/observable/fromPromise";
import "rxjs/add/observable/defer";
import "rxjs/add/operator/mergeMap";
import {Constants} from "./Constants";

export interface IAuthConfig {
    globalHeaders: Array<Object>;
    headerName: string;
    headerPrefix: string;
    noTokenScheme?: boolean;
    tokenGetter: () => string | Promise<string>;
}

export interface IAuthConfigOptional {
    headerName?: string;
    headerPrefix?: string;
    tokenGetter?: () => string | Promise<string>;
    globalHeaders?: Array<Object>;
    noTokenScheme?: boolean;
}

export class AuthConfigConsts {
    public static DEFAULT_HEADER_NAME = 'Authorization';
    public static HEADER_PREFIX_BEARER = 'Bearer ';
}

const AuthConfigDefaults: IAuthConfig = {
    headerName: AuthConfigConsts.DEFAULT_HEADER_NAME,
    headerPrefix: null,
    tokenGetter: () => {
        var currentUser = JSON.parse(localStorage.getItem(Constants.CURRENT_USER));
        var token = currentUser && currentUser.token;
        return token;
    },
    globalHeaders: [],
    noTokenScheme: false
};

/**
 * Sets up the authentication configuration.
 */

export class AuthConfig {

    private _config: IAuthConfig;

    constructor(config?: IAuthConfigOptional) {
        config = config || {};
        this._config = objectAssign({}, AuthConfigDefaults, config);
        if (this._config.headerPrefix) {
            this._config.headerPrefix += ' ';
        } else if (this._config.noTokenScheme) {
            this._config.headerPrefix = '';
        } else {
            this._config.headerPrefix = AuthConfigConsts.HEADER_PREFIX_BEARER;
        }

        if (!config.tokenGetter) {
            this._config.tokenGetter = () => {
                var currentUser = JSON.parse(localStorage.getItem(Constants.CURRENT_USER));
                var token = currentUser && currentUser.token;
                return token;
            };
        }
    }

    public getConfig():IAuthConfig {
        return this._config;
    }

}

export class AuthHttpError extends Error {
}

/**
 * Allows for explicit authenticated HTTP requests.
 */

@Injectable()
export class AuthHttp {

    private config: IAuthConfig;
    public tokenStream: Observable<string>;

    constructor(options: AuthConfig, private http: Http, private defOpts?: RequestOptions) {
        this.config = options.getConfig();

        this.tokenStream = new Observable<string>((obs: any) => {
            obs.next(this.config.tokenGetter());
        });
    }

    private mergeOptions(providedOpts: RequestOptionsArgs, defaultOpts?: RequestOptions) {
        let newOptions = defaultOpts || new RequestOptions();
        if (this.config.globalHeaders) {
            this.setGlobalHeaders(this.config.globalHeaders, providedOpts);
        }

        newOptions = newOptions.merge(new RequestOptions(providedOpts));

        return newOptions;
    }

    private requestHelper(requestArgs: RequestOptionsArgs, additionalOptions?: RequestOptionsArgs): Observable<Response> {
        let options = new RequestOptions(requestArgs);
        if (additionalOptions) {
            options = options.merge(additionalOptions);
        }
        return this.request(new Request(this.mergeOptions(options, this.defOpts)));
    }

    public requestWithToken(req: Request, token: string): Observable<Response> {
        req.headers.set(this.config.headerName, this.config.headerPrefix + token);
        return this.http.request(req);
    }

    public setGlobalHeaders(headers: Array<Object>, request: Request | RequestOptionsArgs) {
        if (!request.headers) {
            request.headers = new Headers();
        }
        headers.forEach((header: Object) => {
            let key: string = Object.keys(header)[0];
            let headerValue: string = (header as any)[key];
            (request.headers as Headers).set(key, headerValue);
        });
    }

    public request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
        if (typeof url === 'string') {
            return this.get(url, options); // Recursion: transform url from String to Request
        }
        // else if ( ! url instanceof Request ) {
        //   throw new Error('First argument must be a url string or Request instance.');
        // }

        // from this point url is always an instance of Request;
        let req: Request = url as Request;

        // Create a cold observable and load the token just in time
        return Observable.defer(() => {
            let token: string | Promise<string> = this.config.tokenGetter();
            if (token instanceof Promise) {
                return Observable.fromPromise(token).mergeMap((jwtToken: string) => this.requestWithToken(req, jwtToken));
            } else {
                return this.requestWithToken(req, token);
            }
        });
    }

    public get(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.requestHelper({ body: '', method: RequestMethod.Get, url: url }, options);
    }

    public post(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.requestHelper({ body: body, method: RequestMethod.Post, url: url }, options);
    }

    public put(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.requestHelper({ body: body, method: RequestMethod.Put, url: url }, options);
    }

    public delete(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.requestHelper({ body: '', method: RequestMethod.Delete, url: url }, options);
    }

    public patch(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.requestHelper({ body: body, method: RequestMethod.Patch, url: url }, options);
    }

    public head(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.requestHelper({ body: '', method: RequestMethod.Head, url: url }, options);
    }

    public options(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.requestHelper({ body: '', method: RequestMethod.Options, url: url }, options);
    }

}

let hasOwnProperty = Object.prototype.hasOwnProperty;
let propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val: any) {
    if (val === null || val === undefined) {
        throw new TypeError('Object.assign cannot be called with null or undefined');
    }

    return Object(val);
}

function objectAssign(target: any, ...source: any[]) {
    let from: any;
    let to = toObject(target);
    let symbols: any;

    for (var s = 1; s < arguments.length; s++) {
        from = Object(arguments[s]);

        for (var key in from) {
            if (hasOwnProperty.call(from, key)) {
                to[key] = from[key];
            }
        }

        if ((<any>Object).getOwnPropertySymbols) {
            symbols = (<any>Object).getOwnPropertySymbols(from);
            for (var i = 0; i < symbols.length; i++) {
                if (propIsEnumerable.call(from, symbols[i])) {
                    to[symbols[i]] = from[symbols[i]];
                }
            }
        }
    }
    return to;
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Start of token decode and token expiration time checking~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//https://github.com/ninjatronic/angular-base64/blob/master/angular-base64.js

/**
 * Helper class to decode and find JWT expiration.
 */

export class JwtHelper {

    private PADCHAR = '=';
    private ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    private getByte64(s: string, i: number) : number {
        var idx = this.ALPHA.indexOf(s.charAt(i));
        if (idx === -1) {
            throw "Cannot decode base64";
        }
        return idx;
    }

    public base64Decode(s: string) : string {
        // convert to string
        s = "" + s;
        var pads, i, b10;
        var imax = s.length;
        if (imax === 0) {
            return s;
        }

        if (imax % 4 !== 0) {
            throw "Cannot decode base64";
        }

        pads = 0;
        if (s.charAt(imax - 1) === this.PADCHAR) {
            pads = 1;
            if (s.charAt(imax - 2) === this.PADCHAR) {
                pads = 2;
            }
            // either way, we want to ignore this last block
            imax -= 4;
        }

        var x = [];
        for (i = 0; i < imax; i += 4) {
            b10 = (this.getByte64(s, i) << 18) | (this.getByte64(s, i + 1) << 12) |
                (this.getByte64(s, i + 2) << 6) | this.getByte64(s, i + 3);
            x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 0xff, b10 & 0xff));
        }

        switch (pads) {
            case 1:
                b10 = (this.getByte64(s, i) << 18) | (this.getByte64(s, i + 1) << 12) | (this.getByte64(s, i + 2) << 6);
                x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 0xff));
                break;
            case 2:
                b10 = (this.getByte64(s, i) << 18) | (this.getByte64(s, i + 1) << 12);
                x.push(String.fromCharCode(b10 >> 16));
                break;
        }
        return x.join('');
    }

    public decodeToken(token: string): any {
        let parts = token.split('.');

        if (parts.length !== 3) {
            throw new Error('JWT must have 3 parts');
        }

        let decoded = this.base64Decode(parts[1]);
        if (!decoded) {
            throw new Error('Cannot decode the token');
        }

        return JSON.parse(decoded);
    }

    public getTokenExpirationDate(token: string): Date {
        let decoded: any;
        decoded = this.decodeToken(token);

        if (!decoded.hasOwnProperty('exp')) {
            return null;
        }
        let date = new Date(0); // The 0 here is the key, which sets the date to the epoch
        date.setUTCSeconds(decoded.exp);

        return date;
    }

    public getTokenExpiration(token: string): number {
        let decoded: any;
        decoded = this.decodeToken(token);

        if (!decoded.hasOwnProperty('exp')) {
            return -1;
        }
        return decoded.exp;
    }

    public isTokenExpiredWithExp(exp: number, offsetSeconds?: number): boolean {
        offsetSeconds = offsetSeconds || 0;
        if (exp == -1) {
            return false;
        }
        let date = new Date(0); // The 0 here is the key, which sets the date to the epoch
        date.setUTCSeconds(exp);
        // Token expired?
        return !(date.valueOf() > (new Date().valueOf() + (offsetSeconds * 1000)));
    }

    public isTokenExpired(token: string, offsetSeconds?: number): boolean {
        let date = this.getTokenExpirationDate(token);
        offsetSeconds = offsetSeconds || 0;

        if (date == null) {
            return false;
        }
        // Token expired?
        return !(date.valueOf() > (new Date().valueOf() + (offsetSeconds * 1000)));
    }
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~End of token decode and token expiration time checking~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

export const AUTH_PROVIDERS: Provider[] = [
    {
        provide: AuthHttp,
        deps: [Http, RequestOptions],
        useFactory: (http: Http, options: RequestOptions) => {
            return new AuthHttp(new AuthConfig(), http, options);
        }
    }
];

export function provideAuth(config?: IAuthConfigOptional): Provider[] {
    return [
        {
            provide: AuthHttp,
            deps: [Http, RequestOptions],
            useFactory: (http: Http, options: RequestOptions) => {
                return new AuthHttp(new AuthConfig(config), http, options);
            }
        }
    ];
}

/**
 * Module for auth-jwt
 * @experimental
 */
// @NgModule({
//     imports: [HttpModule],
//     providers: [AuthHttp]
// })
// export class AuthModule {
//     constructor(@Optional() @SkipSelf() parentModule: AuthModule) {
//         if (parentModule) {
//             throw new Error(
//                 'AuthModule is already loaded. Import it in the AppModule only');
//         }
//     }
//
//     static forRoot(config: AuthConfig): ModuleWithProviders {
//         return {
//             ngModule: AuthModule,
//             providers: [
//                 {provide: AuthConfig, useValue: config}
//             ]
//         };
//     }
// }
