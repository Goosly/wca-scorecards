import {Injectable} from '@angular/core';
import {Event, formatCentiseconds, getEventName, Person, Result, Round} from '@wca/helpers';
import {Helpers} from './helpers';
import {GeneralConfiguration, Wcif} from './classes';

declare var pdfMake: any;

@Injectable({
  providedIn: 'root'
})
export class ScoreCardService {

  private readonly SCORE_CARD_RESULT_WIDTH = 145;

  private addEmptyScoreCardsUntilPageIsFull(scorecards: ScoreCardInfo[], roundNumber: number, wcif: any) {
    const incrementWith = roundNumber === 0 ? 0 : 1;
    while ((scorecards.length + incrementWith) % 4 !== 0) {
      scorecards.push(this.getEmptyScoreCard(wcif));
    }
  }

  public printScoreCardsForRound(wcif: Wcif, event: Event, roundNumber: number, config: GeneralConfiguration) {
    let scorecards: ScoreCardInfo[] = [];
    const round: Round = event.rounds[roundNumber];
    if (roundNumber !== 0) {
      this.enrichWithRankingFromPreviousRound(round.results, roundNumber - 1, wcif, event);
      this.sortByRankingFromPreviousRound(round.results);
    }
    round.results.forEach((r, i) => {
      const scorecard: ScoreCardInfo = this.getScoreCardForEvent(wcif, event, roundNumber);
      scorecard.competitorName = Helpers.nameOfCompetitor(wcif, r.personId);
      scorecard.competitorId = r.personId;
      if (roundNumber !== 0) {
        scorecard.group = Math.floor(i * config.numberOfGroups / round.results.length) + 1;
        scorecard.totalGroups = config.numberOfGroups;
        scorecard.ranking = r['rankingPreviousRound'];
      }
      scorecards.push(scorecard);
    });
    if (roundNumber === 0) {
      scorecards = this.sortScoreCardsByName(scorecards);
    }
    if (config.printStationNumbers) {
      this.enrichWithStationNumbers(scorecards);
    }
    this.addEmptyScoreCardsUntilPageIsFull(scorecards, roundNumber, wcif);
    this.print(wcif, scorecards, roundNumber !== 0);
  }

  private enrichWithStationNumbers(scorecardsForEvent: ScoreCardInfo[]) {
    let stationCounter = 0;
    let group = scorecardsForEvent[0].group;
    scorecardsForEvent.forEach((s: ScoreCardInfo, i: number) => {
      if (s.group == group) {
        stationCounter++;
      } else {
        stationCounter = 1;
        group++;
      }
      s.timerStationId = stationCounter;
    });
  }

  private enrichWithRankingFromPreviousRound(results: Result[], previousRoundNumber: number, wcif: Wcif, event: Event) {
    results.forEach((r: Result) => {
      r['rankingPreviousRound'] = event.rounds[previousRoundNumber].results.filter(pr => pr.personId === r.personId)[0].ranking;
    });
  }

  private sortByRankingFromPreviousRound(results: Result[]) {
    results.sort((a, b) => a['rankingPreviousRound'] - b['rankingPreviousRound']);
  }

  private getScoreCardForEvent(wcif: any, event: Event, roundNumber: number): ScoreCardInfo {
    return {
      eventId: event.id,
      competitionName: wcif.name,
      eventName: getEventName(event.id),
      round: roundNumber + 1,
      group: 1,
      totalGroups: 1,
      competitorId: null,
      competitorName: null,
      timeLimit: this.getTimeLimitOf(event.rounds[roundNumber]),
      cumulative: this.getCumulative(event.rounds[roundNumber]),
      cutoff: this.getCutoffOf(event.rounds[roundNumber]),
      ranking: null,
      timerStationId: null
    }
  }

  private getTimeLimitOf(round: Round): string {
    if (round === null || round.timeLimit === null) {
      return null;
    } else {
      return formatCentiseconds(round.timeLimit.centiseconds);
    }
  }

  private getCumulative(round: Round): boolean {
    if (round === null || round.timeLimit === null || round.timeLimit.cumulativeRoundIds === null) {
      return false;
    } else {
      return round.timeLimit.cumulativeRoundIds.length > 0
    }
  }

  private getCutoffOf(round: Round): string {
    if (round === null || round.cutoff === null) {
      return null;
    } else if (typeof round.cutoff.attemptResult === 'string') {
      return round.cutoff.attemptResult;
    } else {
      return formatCentiseconds(round.cutoff.attemptResult);
    }
  }

  public printFourEmptyScorecards(wcif: Wcif) {
    let scorecards: ScoreCardInfo[] = [
      this.getEmptyScoreCard(wcif),
      this.getEmptyScoreCard(wcif),
      this.getEmptyScoreCard(wcif),
      this.getEmptyScoreCard(wcif)
    ];
    pdfMake.createPdf(this.document(scorecards, false)).download('emptyScorecards-' + wcif.id + '.pdf');
  }

  private getEmptyScoreCard(wcif): ScoreCardInfo {
    return {
      eventId: ' ',
      competitionName: wcif.name,
      eventName: ' ',
      round: null,
      group: null,
      totalGroups: null,
      competitorId: null,
      competitorName: ' ',
      timeLimit: null,
      cumulative: false,
      cutoff: null,
      ranking: null,
      timerStationId: null,
    }
  }

  private print(wcif: any, scorecards: ScoreCardInfo[], withSummary: boolean) {
    if (scorecards.length === 0) {
      alert('Something went wrong: trying to print zero scorecards');
    } else {
      pdfMake.createPdf(this.document(scorecards, withSummary)).download('scorecards-' + wcif.id + '.pdf');
    }
  }

  private document(scorecards, withSummary: boolean): any {
    let document = {
      content: [

      ],
      styles: {
      },
      defaultStyle: {
        fontSize: 12
      }
    };
    for (let i = withSummary ? -1 : 0; i < scorecards.length; i += 4) {
      let onePage = [
        [
          {stack: i === -1 ? this.getSummary(scorecards) : this.getScoreCardTemplate(scorecards[i]), border: [false, false, false, false]},
          {text: '', border: [false, false, false, false]},
          {text: '', border: [true, false, false, false]},
          {stack: this.getScoreCardTemplate(scorecards[i + 1]), border: [false, false, false, false]}
        ],
        [
          {text: '', border: [false, true, false, false]},
          {text: '', border: [false, true, false, false]},
          {text: '', border: [true, true, false, false]},
          {text: '', border: [false, true, false, false]}
        ],
        [
          {stack: this.getScoreCardTemplate(scorecards[i + 2]), border: [false, false, false, false]},
          {text: '', border: [false, false, false, false]},
          {text: '', border: [true, false, false, false]},
          {stack: this.getScoreCardTemplate(scorecards[i + 3]), border: [false, false, false, false]}
        ]
      ];
      let page = {
        table: {
          heights: [384, 22, 364],
          widths: [260, 2, 8, 260],
          body: onePage
        },
        layout: {
          hLineColor: function (i, node) {
            return '#d3d3d3';
          },
          vLineColor: function (i, node) {
            return '#d3d3d3';
          }
        },
        margin: [-20,-10],
        pageBreak: 'after'
      };
      document.content.push(page);
    }
    document.content[document.content.length - 1].pageBreak = null;
    return document;
  }

  private getScoreCardTemplate(info: ScoreCardInfo) {
    if ('333mbf' === info.eventId) {
      return this.oneMbldScoreCard(info);
    } else if (['666', '777', '333bf', '444bf', '555bf'].includes(info.eventId)) {
      return this.oneMo3ScoreCard(info);
    }
    return this.oneAvg5ScoreCard(info);
  }

  private oneMo3ScoreCard(info: ScoreCardInfo): any[]  {
    return [
      [
        {text: ! info.timerStationId ? '' : 'Timer ' + info.timerStationId, alignment: 'right', fontSize: 9},
        {text: info.competitionName, alignment: 'center', fontSize: 10}
      ],
      {text: info.eventName, alignment: 'center', fontSize: 18, bold: true},
      (this.roundGroupAndRankingInfo(info)),
      {table : {
          widths: [30, this.SCORE_CARD_RESULT_WIDTH + 58],
          body: [[
            {text: (info.competitorId === null ? ' ' : info.competitorId), fontSize: 16, alignment: 'center'},
            {text: info.competitorName, fontSize: 16, alignment: 'center'}]]
        },margin: [0, 5]},
      {text: info.cumulative ? 'Also write down the time for a DNF!' : '', bold: true, alignment: 'center'},
      {table : {
          widths: [5, 16, this.SCORE_CARD_RESULT_WIDTH, 20, 20],
          body: [[
            {text:''},
            {text:'S', alignment: 'center'},
            {text:
                info.cumulative ? 'Result\n(Cumulative limit: ' + info.timeLimit + ')' :
                  (info.timeLimit !== null ? 'Result (DNF if ≥ ' + info.timeLimit + ')' : ''),
              alignment: 'center', fontSize: info.cumulative ? 10 : 12 },
            {text:'J', alignment: 'center'},
            {text:'C', alignment: 'center'}],
            [{text:'1', margin: [0, 7]}, '', '', '', '']]
        },margin: [0, 2]},
      {text: info.cutoff !== null ? '-------------- Continue if 1 < ' + info.cutoff +' --------------' : '', alignment: 'center', fontSize: 10},
      {table : {
          widths: [5, 16, this.SCORE_CARD_RESULT_WIDTH, 20, 20],
          body: [
            [{text:'2', margin: [0, 7]}, '', '', '', ''],
            [{text:'3', margin: [0, 7]}, '', '', '', '']]
        },margin: [0, 2]},
      {text: '-------------- Extra or provisional --------------', alignment: 'center', fontSize: 10},
      {table : {
          widths: [5, 16, this.SCORE_CARD_RESULT_WIDTH, 20, 20],
          body: [[{text:'E', margin: [0, 5]}, '', '', '', '']]
        },margin: [0, 2]}
    ]
  }

  private oneAvg5ScoreCard(info: ScoreCardInfo): any[]  {
    return [
      [
        {text: ! info.timerStationId ? '' : 'Timer ' + info.timerStationId, alignment: 'right', fontSize: 9},
        {text: info.competitionName, alignment: 'center', fontSize: 10}
      ],
      {text: info.eventName, alignment: 'center', fontSize: 18, bold: true},
      (this.roundGroupAndRankingInfo(info)),
      {table : {
          widths: [30, this.SCORE_CARD_RESULT_WIDTH + 58],
          body: [[
            {text: (info.competitorId === null ? ' ' : info.competitorId), fontSize: 16, alignment: 'center'},
            {text: info.competitorName, fontSize: 16, alignment: 'center'}]]
        },margin: [0, 5]},
      {text: info.cumulative ? 'Also write down the time for a DNF!' : '', bold: true, alignment: 'center'},
      {table : {
          widths: [5, 16, this.SCORE_CARD_RESULT_WIDTH, 20, 20],
          body: [[
            {text:''},
            {text:'S', alignment: 'center'},
            {text:
                info.cumulative ? 'Result\n(Cumulative limit: ' + info.timeLimit + ')' :
                  (info.timeLimit !== null ? 'Result (DNF if ≥ ' + info.timeLimit + ')' : ''),
              alignment: 'center', fontSize: info.cumulative ? 10 : 12 },
            {text:'J', alignment: 'center'},
            {text:'C', alignment: 'center'}],
            [{text:'1', margin: [0, 7]}, '', '', '', ''],
            [{text:'2', margin: [0, 7]}, '', '', '', '']]
        },margin: [0, 2]},
      {text: info.cutoff !== null ? '-------------- Continue if 1 or 2 < ' + info.cutoff +' --------------' : '', alignment: 'center', fontSize: 10},
      {table : {
          widths: [5, 16, this.SCORE_CARD_RESULT_WIDTH, 20, 20],
          body: [
            [{text:'3', margin: [0, 7]}, '', '', '', ''],
            [{text:'4', margin: [0, 7]}, '', '', '', ''],
            [{text:'5', margin: [0, 7]}, '', '', '', '']]
        },margin: [0, 2]},
      {text: '-------------- Extra or provisional --------------', alignment: 'center', fontSize: 10},
      {table : {
          widths: [5, 16, this.SCORE_CARD_RESULT_WIDTH, 20, 20],
          body: [[{text:'E', margin: [0, 5]}, '', '', '', '']]
        },margin: [0, 2]}
    ]
  }

  private oneMbldScoreCard(info: ScoreCardInfo): any[]  {
    return [
      [
        {text: ! info.timerStationId ? '' : 'Timer ' + info.timerStationId, alignment: 'right', fontSize: 9},
        {text: info.competitionName, alignment: 'center', fontSize: 10}
      ],
      {text: info.eventName, alignment: 'center', fontSize: 18, bold: true},
      (this.roundGroupAndRankingInfo(info)),
      {table : {
          widths: [30, this.SCORE_CARD_RESULT_WIDTH + 58],
          body: [[
            {text: (info.competitorId === null ? ' ' : info.competitorId), fontSize: 16, alignment: 'center'},
            {text: info.competitorName, fontSize: 16, alignment: 'center'}]]
        },margin: [0, 5]},
      {text: 'Count and write down the number of cubes before the attempt starts', bold: true, alignment: 'center'},
      {table : {
          widths: [5, 16, this.SCORE_CARD_RESULT_WIDTH, 20, 20],
          body: [[
            {text:''},
            {text:'S', alignment: 'center'},
            {text: 'Result', alignment: 'center'},
            {text:'J', alignment: 'center'},
            {text:'C', alignment: 'center'}],
            [{text:'1', margin: [0, 7]}, '',
              {text:'_______ / _______\n\nTime:', margin: [0, 7]}, '', ''],
            [{text:'2', margin: [0, 7]}, '',
              {text:'_______ / _______\n\nTime:', margin: [0, 7]}, '', ''],
            [{text:'3', margin: [0, 7]}, '',
              {text:'_______ / _______\n\nTime:', margin: [0, 7]}, '', '']]
        },margin: [0, 2]}
    ]
  }

  private roundGroupAndRankingInfo(info: ScoreCardInfo) {
    return {
      text: 'Round ' + (info.round === null ? '    ' : info.round)
        + ' | Group ' + (info.group === null ? '    ' : info.group)
        + ' of ' + (info.totalGroups === null ? '    ' : info.totalGroups)
        + (info.ranking === null ? '' : ' | Ranking: ' + info.ranking), alignment: 'center', fontSize: 10
    };
  }

  private sortScoreCardsByName(scorecards: ScoreCardInfo[]) {
    return scorecards.sort(function(a, b) {
      const textA = a.competitorName.toUpperCase();
      const textB = b.competitorName.toUpperCase();
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
  }

  private getSummary(scorecards: ScoreCardInfo[]) {
    const groups = new Set(scorecards.map(s => s.group));

    let list = '';
    groups.forEach(group => {
      if (!!group) {
        const lowestRanking = Math.min(...scorecards.filter(s => s.group === group).map(s => s.ranking));
        const highestRanking = Math.max(...scorecards.filter(s => s.group === group).map(s => s.ranking));
        list += `Group ${group}: ranking ${lowestRanking} to ${highestRanking}\n`;
      }
    });

    return [{
      text: 'Give this summary to the announcer, so they can clearly announce the groups to the competitors\n\n' + list
    }];
  }
}

export class ScoreCardInfo {
  eventId: string;
  competitionName: string;
  eventName: string;
  round: number;
  group: number;
  totalGroups: number;
  competitorId: number;
  competitorName: string;
  timeLimit: string;
  cumulative: boolean;
  cutoff: string;
  ranking: number;
  timerStationId: number;
}
