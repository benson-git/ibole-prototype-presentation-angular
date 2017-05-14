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
import any = jasmine.any;

export interface IAuthConfig {
    globalHeaders: Array<Object>;
    headerName: string;
    headerPrefix: string;
    noTokenScheme?: boolean;
    tokenGetter: () => string | Promise<string>;
    renewUrl: string;
}

export interface IAuthConfigOptional {
    headerName?: string;
    headerPrefix?: string;
    tokenGetter?: () => string | Promise<string>;
    globalHeaders?: Array<Object>;
    noTokenScheme?: boolean;
    renewUrl?: string;
}

export class AuthConfigConsts {
    public static DEFAULT_HEADER_NAME = 'Authorization';
    public static HEADER_PREFIX_BEARER = 'Bearer ';
}

const AuthConfigDefaults: IAuthConfig = {
    headerName: AuthConfigConsts.DEFAULT_HEADER_NAME,
    headerPrefix: null,
    tokenGetter: () => getAccessTokenFromSessionStorage(),
    globalHeaders: [],
    noTokenScheme: false,
    renewUrl: '/api/v1/auth/renew',
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
            this._config.tokenGetter = () => getAccessTokenFromSessionStorage();
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
    private jwtHelper = new JwtHelper();
    public tokenStream: Observable<string>;
    //token expiration time in number
    public exp: number = -1;

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

    public handleToken(req: Request, token: string): Observable<Response> {
       //init load or handling page refresh
        if (this.exp == -1) {
            let currentSessionUser = JSON.parse(sessionStorage.getItem(Constants.CURRENT_USER));
            this.exp = currentSessionUser && currentSessionUser.exp;
        }
        //access-token expired handling process
        if (this.jwtHelper.isTokenExpiredWithExp(this.exp, 1)){
            console.log("Access token is expired!");
            let currentLocalUser = JSON.parse(localStorage.getItem(Constants.CURRENT_USER));
            let refreshToken = currentLocalUser.token;
            let headers = new Headers({ 'Content-Type': 'application/json;charset=UTF-8' });
            let options = new RequestOptions({ headers: headers });
            let observable : Observable<Response>;
            observable = this.http.post(this.config.renewUrl, JSON.stringify({ refreshToken: refreshToken }), options)
                .map((response: Response) => {
                    let tokenRenewResponse = response.json();
                    console.log("Token status from response: "+tokenRenewResponse.tokenStatus);
                    if(tokenRenewResponse && !tokenRenewResponse.loginRequired) {
                        token = tokenRenewResponse.accessToken;
                        let newExp = this.jwtHelper.getTokenExpiration(token);
                        sessionStorage.setItem(Constants.CURRENT_USER, JSON.stringify({ username: currentLocalUser && currentLocalUser.username,
                            token: tokenRenewResponse.token, exp: newExp}));
                    } else {
                            console.log("Refresh token is invalid or has expired!");
                            return Observable.throw(new AuthHttpError(JSON.stringify(
                                {status: '401', message: 'JWT is invalid or has expired'})));
                    }
                }).catch((err: Response): any => {
                        return Observable.throw(err);
                });
            //observable.
        }
    //
    // .catch((err, source) => {
    //         if (err.status  == 401 && err.url.search('/authenticate') == -1 ) {
    //             this._router.navigate(['/login']);
    //             return Observable.empty();
    //         } else {
    //             return Observable.throw(err);
    //         }
    //     });

        req.headers.set(this.config.headerName, this.config.headerPrefix + token);
        return this.http.request(req);
    }

    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error);
        return Promise.reject(error.message || error);
    }

    private parseAuthenticationHeader(response: any) : string {
        let authorization = response.headers.get(this.config.headerName);
        let token: string;
        if (this.config.noTokenScheme) {
            token = authorization;
        } else {
            let authParts = authorization.split(" ");
            token = authParts && authParts[1];
        }
        return token;
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
        // from this point url is always an instance of Request;
        let req: Request = url as Request;
        // Create a cold observable and load the token just in time
        return Observable.defer(() => {
            let token: string | Promise<string> = this.config.tokenGetter();
            if (token instanceof Promise) {
                return Observable.fromPromise(token).mergeMap((jwtToken: string) => this.handleToken(req, jwtToken));
            } else {
                return this.handleToken(req, token);
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

function  getAccessTokenFromSessionStorage() {
    var currentUser = JSON.parse(sessionStorage.getItem(Constants.CURRENT_USER));
    var token = currentUser && currentUser.token;
    return token;
}

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
//https://github.com/stranger82/angular-utf8-base64/blob/master/angular-utf8-base64.js

/**
 * Helper class to decode and find JWT expiration.
 */

export class JwtHelper {

    private ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    /**
     * utf8-base64 decode.
     * @param input
     * @returns {string}
     */
    public  urlBase64Decode(input: string) : string{
        // Replace non-url compatible chars with base64 standard chars
        input = input
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        // Pad out with standard base64 required padding characters
        var pad = input.length % 4;
        if(pad) {
            if(pad === 1) {
                throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
            }
            input += new Array(5-pad).join('=');
        }

        return this.base64Decode(input);
    }
    public base64Decode(s: string) : string {
        /* jshint bitwise:false */
        s = s.replace(/\s/g, '');
        if (s.length % 4)
            throw new Error('InvalidLengthError: decode failed: The string to be decoded is not the correct length for a base64 encoded string.');
        if(/[^A-Za-z0-9+\/=\s]/g.test(s))
            throw new Error('InvalidCharacterError: decode failed: The string contains characters invalid in a base64 encoded string.');

        var buffer = this.fromUtf8(s),
            position = 0,
            result,
            len = buffer.length;
            result = '';
            while (position < len) {
                if (buffer[position] < 128)
                    result += String.fromCharCode(buffer[position++]);
                else if (buffer[position] > 191 && buffer[position] < 224)
                    result += String.fromCharCode(((buffer[position++] & 31) << 6) | (buffer[position++] & 63));
                else
                    result += String.fromCharCode(((buffer[position++] & 15) << 12) | ((buffer[position++] & 63) << 6) | (buffer[position++] & 63));
            }
            return result;

    }

    public fromUtf8(s: string) : any {
        /* jshint bitwise:false */
        let position = -1,
            len, buffer = [],
            lookup: any = null,
            enc: any = [, , , ];
        if (!lookup) {
            len = this.ALPHA.length;
            lookup = {};
            while (++position < len)
                lookup[this.ALPHA.charAt(position)] = position;
            position = -1;
        }
        len = s.length;
        while (++position < len) {
            enc[0] = lookup[s.charAt(position)];
            enc[1] = lookup[s.charAt(++position)];
            buffer.push((enc[0] << 2) | (enc[1] >> 4));
            enc[2] = lookup[s.charAt(++position)];
            if (enc[2] === 64)
                break;
            buffer.push(((enc[1] & 15) << 4) | (enc[2] >> 2));
            enc[3] = lookup[s.charAt(++position)];
            if (enc[3] === 64)
                break;
            buffer.push(((enc[2] & 3) << 6) | enc[3]);
        }
        return buffer;
    }

    public decodeToken(token: string): any {
        let parts = token.split('.');

        if (parts.length !== 3) {
            throw new Error('JWT must have 3 parts');
        }

        let decoded = this.urlBase64Decode(parts[1]);
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
