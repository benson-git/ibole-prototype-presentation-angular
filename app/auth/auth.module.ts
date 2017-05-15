/**
 * Created by bwang on 2017/5/10.
 */
import { NgModule } from '@angular/core';
import { Http, RequestOptions } from '@angular/http';
import {AuthHttp, AuthConfig, JwtHelper} from './auth-jwt';
import {AuthService} from "./auth.service";
import {AuthGuard} from "./auth.guard";

export function authHttpServiceFactory(http: Http, options: RequestOptions) {
    return new AuthHttp(new AuthConfig({
        renewUrl: '/api/v1/auth/renew',
        globalHeaders: [{'Content-Type':'application/json;charset=UTF-8'}],
    }), http, options);
}

@NgModule({
    providers: [
        {
            provide: AuthHttp,
            useFactory: authHttpServiceFactory,
            deps: [Http, RequestOptions]
        },
        JwtHelper,
        AuthService,
        AuthGuard
    ]
})
export class AuthModule {}
