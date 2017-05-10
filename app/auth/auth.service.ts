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
                let token = response.json() && response.json().token;
                if (token) {
                    // store username and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem(Constants.CURRENT_USER, JSON.stringify({ username: username, token: token,
                        exp: this.jwtHelper.getTokenExpiration(token) }));
                    // return true to indicate successful login
                    return true;
                } else {
                    // return false to indicate failed login
                    return false;
                }
            });
    }

    logout(): void {
        // clear token remove user from local storage to log user out
        localStorage.removeItem(Constants.CURRENT_USER);
    }

    loggedIn() {
        // check if token has been saved in local storage
        var currentUser = JSON.parse(localStorage.getItem(Constants.CURRENT_USER));
        var token = currentUser && currentUser.token;
        if (token) {
            // logged in so return true
            return true;
        }
    }
}