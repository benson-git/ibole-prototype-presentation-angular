// Import the core angular services.
import { Http } from "@angular/http";
import { Injectable } from "@angular/core";
import { Response } from "@angular/http";

@Injectable()
export class ErrorLogService {

    private http: Http;

    constructor( http: Http) {
        this.http = http;
    }
// ---
// PUBLIC METHODS.
// ---

//log the given error to various aggregation and tracking services.
    public logError( error: any ) : void {

// Internal tracking.
        this.sendToConsole( error );
        //this.sendToServer( error );

// Software-as-a-Service (SaaS) tracking.
// of these in the same application.
        //this.sendToNewRelic( error );
        //this.sendToRaygun( error );
        //this.sendToRollbar( error );
        //this.sendToTrackJs( error );

    }

// ---
// PRIVATE METHODS.
// ---

// send the error to browser console (safely, if it exists).
    private sendToConsole(error: any): void {
        if ( console && console.group && console.error ) {
            console.group( "Error Log Service" );
            console.error( error );
            console.error( error.message );
            console.error( error.stack );
            console.groupEnd();
        }
    }

// send the error to the NewRelic error logging service.
//    private sendToNewRelic( error: any ) : void {
// Read more: https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-apis/report-data-events-browser-agent-api
        //newrelic.noticeError( error );
 //   }

// send the error to the server-side error tracking end-point.
    private sendToServer( error: any ) : void {
        this.http
            .post(
                "./error-logging-endpoint",
                {
                    type: error.name,
                    message: error.message,
                    stack: error.stack,
                    location: window.location.href
                }
            )
            .subscribe(
                ( httpResponse: Response ) : void => {
                     // ... nothing to do here.
                },
                ( httpError: any ) : void => {
                   console.log( "Http error:", httpError );
                }
            );
    }

}