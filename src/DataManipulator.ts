import { ServerRespond } from './DataStreamer';

export interface Row {
  price_abc: number,
  price_def: number,
  timestamp: Date,
  upper_bound: number,
  lower_bound: number,
  ratio: number,
  trigger_alert: number | undefined,
}


export class DataManipulator {

  static movingAvg12mo: number = NaN ;
  static historicRatios: number[] = [];

  // Assumes there is a daily ratio and 252 trading days per year to calculate
  // 12 month moving average.
  static calcMovingAvg12mo(ratio: number): number {
    let countOfRatios;

    // Account for first value in.
    if (isNaN(DataManipulator.movingAvg12mo)) {
        DataManipulator.movingAvg12mo = ratio;
        DataManipulator.historicRatios.push(ratio)
        countOfRatios = DataManipulator.historicRatios.length
        return ratio;
    }
    else {
      countOfRatios = DataManipulator.historicRatios.length

      // Use 252 days as the average number of trading days in a year.
      if (DataManipulator.historicRatios.length < 252) {
          DataManipulator.historicRatios.push(ratio);
          return (DataManipulator.movingAvg12mo*(countOfRatios-1) + ratio)/countOfRatios;
      }
      else {
          let oldValue = DataManipulator.historicRatios.shift();
          DataManipulator.historicRatios.push(ratio);
          return (DataManipulator.movingAvg12mo*(countOfRatios-1) - oldValue! + ratio)/countOfRatios
      }
    }
  }
  static generateRow(serverResponds: ServerRespond[]): Row {
    const priceABC = (serverResponds[0].top_ask.price + serverResponds[0].top_bid.price) / 2;
    const priceDEF = (serverResponds[1].top_ask.price + serverResponds[1].top_bid.price) / 2;
    const ratio = priceABC/priceDEF;
    const movingAvg = DataManipulator.calcMovingAvg12mo(ratio);
    const upperBound = movingAvg*1.05;
    const lowerBound = movingAvg*0.95;

    return {
        price_abc: priceABC,
        price_def: priceDEF,
        ratio,
        timestamp: serverResponds[0].timestamp > serverResponds[1].timestamp ?
            serverResponds[0].timestamp : serverResponds[1].timestamp,
        upper_bound: upperBound,
        lower_bound: lowerBound,
        trigger_alert: (ratio > upperBound || ratio < lowerBound) ? ratio : undefined,
    };
  }
}
