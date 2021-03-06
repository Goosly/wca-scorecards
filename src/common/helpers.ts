import {Wcif} from './classes';

export class Helpers {

  public static sortCompetitorsByEvent(wcif: Wcif, eventId: string) {
    // todo parse wcif filled by groupifier to get the groups
    wcif.persons = wcif.persons.sort(function(a, b) {
      var textA = a[eventId].group;
      var textB = b[eventId].group;
      if (textA === '') {
        return 1;
      }
      if (textB === '') {
        return -1;
      }
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
  }

  public static sortCompetitorsByName(wcif: Wcif) {
    wcif.persons = wcif.persons.sort(function(a, b) {
      var textA = a.name.toUpperCase();
      var textB = b.name.toUpperCase();
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
  }

  public static nameOfCompetitor(wcif:Wcif, registrantId: number) {
    const filter = wcif.persons.filter(p => p.registrantId === registrantId);
    return filter.length === 1 ? filter[0].name : '';
  }

}
