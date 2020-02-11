import { Component } from '@angular/core';
import { ApiService } from '../common/api';
import { Event } from '@wca/helpers/lib/models/event';
import { ScoreCardService } from '../common/scorecard';
import {getEventName} from '@wca/helpers';
declare var $ :any;

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent  {
  state: 'PRINT' | 'EDIT' | 'REFRESHING' = 'PRINT';

  // Info about competitions managed by user
  competitionsToChooseFrom: Array<String> = null;
  competitionId: string;
  wcif: any;

  constructor (
          public apiService: ApiService,
          public scoreCardService: ScoreCardService) {
      if (this.apiService.oauthToken) {
        this.handleGetCompetitions();
      }
  }

  handleLoginToWca() {
    this.apiService.logIn();
  }

  handleGetCompetitions() {
    this.apiService.getCompetitions().subscribe(comps => {
      if (comps.length === 1) {
        this.handleCompetitionSelected(comps[0]['id']);
      }
      this.competitionsToChooseFrom = comps.map(c => c['id']);
    });
  }

  handleCompetitionSelected(competitionId: string) {
    this.competitionId = competitionId;
    this.loadWcif();
  }

  handleRefreshCompetition() {
    this.state = 'REFRESHING';
    this.loadWcif();
  }

  handlePrintAllFirstRounds() {
    // todo
  }

  nameOfEventId(id) {
    return getEventName(id);
  }

  private loadWcif() {
    this.apiService.getWcif(this.competitionId).subscribe(wcif => {
      this.wcif = wcif;
      try {
        this.wcif.events = this.wcif.events.filter(e => e.id !== '333fm');

        this.wcif.persons.forEach(p => {
          p.fullName = p.name;
          p.name = p.name.split('(')[0];
        });

        this.state = 'PRINT';
      } catch (error) {
        alert('An error occured, see console');
        console.error(error);
        this.wcif = null;
        this.competitionId = null;
      }
    });
  }

    // let event: Event = this.events.filter(e => e.id === eventId)[0];
    // let results: Result[] = event.rounds[event.rounds.length - 1].results;
    // return results.filter(r => r['best'] > 0);

}
