import { Injectable } from '@angular/core';
import {Http, Headers, Response, RequestOptions} from '@angular/http';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/map'
import {AuthHttp} from "./auth-jwt";
import {CONSTANT} from "./CONSTANT";

@Injectable()
export class AuthService {

    constructor(private http: AuthHttp) {}

    login(url: string, username: string, password: string): Observable<boolean> {
        return this.http.post(url, JSON.stringify({ username: username, password: password }))
            .map((response: Response) => {
                // login successful if there's a jwt token in the response
                let token = response.json() && response.json().token;
                if (token) {
                    // store username and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem(CONSTANT.CURRENT_USER, JSON.stringify({ username: username, token: token }));
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
        localStorage.removeItem(CONSTANT.CURRENT_USER);
    }

    loggedIn() {
        // check if token has been saved in local storage
        var currentUser = JSON.parse(localStorage.getItem(CONSTANT.CURRENT_USER));
        var token = currentUser && currentUser.token;
        if (token) {
            // logged in so return true
            return true;
        }
    }
}