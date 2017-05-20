import { Injectable } from '@angular/core';
import {Http, Headers, Response, RequestOptions} from '@angular/http';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/map'
import {AuthHttp, JwtHelper} from "./auth-jwt";
import {Constants} from "./Constants";

@Injectable()  
export class AuthService {
   //don't need change to AuthHttp here as in login/logout process
    constructor(private http: Http, private jwtHelper: JwtHelper) {}

    login(url: string, username: string, password: string): Observable<boolean> {
        let headers = new Headers({ 'Content-Type': 'application/json;charset=UTF-8' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(url, JSON.stringify({ username: username, password: password }),
            options)
            .map((response: Response) => {
                // login successful if there's a jwt token in the response
                let tokenInfo = response.json();
                let accessToken = tokenInfo && tokenInfo.accessToken;
                let refreshToken = tokenInfo && tokenInfo.refreshToken;
                if (accessToken && refreshToken) {
                    // store username and access token in session storage to keep user logged in between page refreshes.
                    sessionStorage.setItem(Constants.CURRENT_USER, JSON.stringify({ username: username, token: accessToken,
                        exp: this.jwtHelper.getTokenExpiration(accessToken) }));
                    // store username and refresh token in local storage to renew access token from server with this refresh token
                    // once the access is expired.
                    localStorage.setItem(Constants.CURRENT_USER, JSON.stringify({ username: username, token: refreshToken,
                        exp: this.jwtHelper.getTokenExpiration(refreshToken) }));
                    // return true to indicate successful login
                    return true;
                } else {
                    // return false to indicate failed login
                    return false;
                }
            });
    }

    logout(): void {
        // clear token remove user from local&session storage to log user out
        console.log("logout")
        sessionStorage.removeItem(Constants.CURRENT_USER);
        localStorage.removeItem(Constants.CURRENT_USER);
    }

    hasCredentials() {
        var currentUser = JSON.parse(localStorage.getItem(Constants.CURRENT_USER));
        var token = currentUser && currentUser.token;
        var exp = currentUser && currentUser.exp;
        var expired = this.jwtHelper.isTokenExpiredWithExp(exp, 1);
        // check if token has been saved in local storage and if refresh token is expired
        if (token && !expired) {
            // logged in so return true
            return true;
        } else {
            return false;
        }
    }
}