// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

export class VoteManager {
  #votes = new Map();

  add(userId, rawVote) {
    const vote = String(rawVote);
    if (!userId || (vote !== "1" && vote !== "2") || this.#votes.has(userId)) return false;
    this.#votes.set(userId, vote);
    return true;
  }

  tally() {
    let option1Votes = 0;
    let option2Votes = 0;
    for (const vote of this.#votes.values()) {
      if (vote === "1") option1Votes += 1;
      if (vote === "2") option2Votes += 1;
    }
    return { option1Votes, option2Votes, totalVotes: this.#votes.size };
  }

  winner(random = Math.random) {
    const { option1Votes, option2Votes } = this.tally();
    if (option1Votes > option2Votes) return "1";
    if (option2Votes > option1Votes) return "2";
    return random() < 0.5 ? "1" : "2";
  }

  reset() {
    this.#votes.clear();
  }
}
