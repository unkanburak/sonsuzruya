import test from "node:test";
import assert from "node:assert/strict";
import { VoteManager } from "../app/lib/vote-manager.mjs";

test("only exact 1/2 votes and first vote per user count", () => {
  const votes = new VoteManager();
  assert.equal(votes.add("a", "1"), true);
  assert.equal(votes.add("a", "2"), false);
  assert.equal(votes.add("b", "hello"), false);
  assert.equal(votes.add("b", " 1 "), false);
  assert.equal(votes.add("", "1"), false);
  assert.equal(votes.add("c", "2"), true);
  assert.deepEqual(votes.tally(), { option1Votes: 1, option2Votes: 1, totalVotes: 2 });
});

test("ties and empty rounds use random choice", () => {
  const votes = new VoteManager();
  assert.equal(votes.winner(() => 0.1), "1");
  assert.equal(votes.winner(() => 0.9), "2");
});
