/* Données factuelles reprises du site chaletletalonlibre.com et des annonces chalet-montagne.com liées par ce site.
   Tout ce qui manque est marqué "a completer". */
window.TL_DATA = {
  contact: {
    phone: '+41 78 642 45 29',
    phoneHref: 'tel:+41786424529',
    email: 'contact@chaletletalonlibre.com',
    facebook: 'https://www.facebook.com/chalettalonlibre',
    instagram: 'https://www.instagram.com/chalet_le_talon_libre/',
    youtube: 'https://www.youtube.com/watch?v=UU55SJkizW4'
  },
  chalet: {
    capacity: 10,
    minNights: 3,
    checkIn: '16h – 20h',
    checkOut: '9h30',
    checkInEn: '4–8 pm',
    checkOutEn: '9:30 am',
    deposit: 1500,
    planning: 'https://www.chalet-montagne.com/15855/planning',
    weeks: [] /* tarifs non publiés : a completer */
  },
  annexe: {
    capacity: 6,
    minNights: 4,
    checkIn: '15h – 19h',
    checkOut: '10h00',
    checkInEn: '3–7 pm',
    checkOutEn: '10 am',
    deposit: 500,
    planning: 'https://www.chalet-montagne.com/18961/planning',
    /* Appartement 6 personnes, tarifs publiés sur chalet-montagne.com (relevés le 19/10/2026) */
    weeks: [
      ['2026-12-12', '2026-12-19', 2100], ['2026-12-19', '2026-12-26', 3150], ['2026-12-26', '2027-01-02', 3300],
      ['2027-01-02', '2027-01-09', 1800], ['2027-01-09', '2027-01-16', 1800], ['2027-01-16', '2027-01-23', 1800],
      ['2027-01-23', '2027-01-30', 2300], ['2027-01-30', '2027-02-06', 2800],
      ['2027-02-06', '2027-02-13', 3300], ['2027-02-14', '2027-02-21', 3300], ['2027-02-21', '2027-02-28', 3300],
      ['2027-02-27', '2027-03-06', 3200], ['2027-02-28', '2027-03-07', 3300],
      ['2027-03-06', '2027-03-13', 2200], ['2027-03-13', '2027-03-20', 2200], ['2027-03-20', '2027-03-27', 1800],
      ['2027-03-27', '2027-04-03', 1800], ['2027-04-03', '2027-04-10', 1800], ['2027-04-10', '2027-04-17', 1500],
      ['2027-07-03', '2027-07-10', 1150], ['2027-07-04', '2027-07-11', 1150], ['2027-07-10', '2027-07-17', 1300],
      ['2027-07-11', '2027-07-18', 1300], ['2027-07-17', '2027-07-24', 1380], ['2027-07-18', '2027-07-25', 1380],
      ['2027-07-24', '2027-07-31', 1380], ['2027-07-25', '2027-08-01', 1380], ['2027-07-31', '2027-08-07', 1380],
      ['2027-08-01', '2027-08-08', 1380], ['2027-08-07', '2027-08-14', 1380], ['2027-08-08', '2027-08-15', 1380],
      ['2027-08-14', '2027-08-21', 1380], ['2027-08-15', '2027-08-22', 1380], ['2027-08-21', '2027-08-28', 1200],
      ['2028-01-01', '2028-01-08', 3300], ['2028-01-08', '2028-01-15', 2200]
    ]
  },
  payment: { first: 0.25, second: 0.25, secondMonthsBefore: 2, balanceWorkingDaysBefore: 10 },
  cancellation: { fullRefundDays: 30, halfDays: 15 }
};
