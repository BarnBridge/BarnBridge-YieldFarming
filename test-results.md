# Test results
```shell
  CommunityVault
    General Contract checks
      ✓ should be deployed
    Contract Tests
      ✓ Mint bond tokens in community vault address (45ms)
      ✓ should fail if no owner tries to set allowance (38ms)
      ✓ should set allowance as owner (71ms)
      ✓ should transfer ownership (48ms)
    Events
      ✓ setAllowance emits SetAllowance (58ms)

  Staking
    ✓ Can deploy successfully
    Deposit
      ✓ Reverts if amount is <= 0
      ✓ Reverts if amount > allowance (41ms)
      ✓ Saves users deposit in state (132ms)
      ✓ Calls transferFrom when conditions are met (126ms)
      ✓ Updates the pool size of the next epoch (117ms)
      ✓ Updates the user balance of the next epoch (246ms)
      Continuous deposits
        ✓ Deposit at random points inside an epoch sets the correct effective balance (596ms)
        ✓ deposit in middle of epoch 1 (108ms)
        ✓ deposit epoch 1, deposit epoch 4 (212ms)
        ✓ deposit epoch 1, deposit epoch 2 (169ms)
        ✓ deposit epoch 1, deposit epoch 5, deposit epoch 5 (251ms)
    Withdraw
      ✓ Reverts if user has no balance
      ✓ Sets the balance of the user to 0 (109ms)
      ✓ Calls the `transfer` function on token when all conditions are met (117ms)
      Partial withdraw
        ✓ deposit epoch 1, withdraw epoch 5 (161ms)
        ✓ deposit epoch 1, withdraw epoch 2 (131ms)
        ✓ deposit epoch 1, deposit epoch 5, withdraw epoch 5 half amount (245ms)
        ✓ deposit epoch 1, deposit epoch 5, withdraw epoch 5 more than deposited (242ms)
    Epoch logic
      ✓ deposit in epoch 0, deposit in epoch 1, deposit in epoch 2, withdraw in epoch 3 (291ms)
      ✓ deposit in epoch 0, withdraw in epoch 3 (133ms)
      ✓ deposit in epoch 0, withdraw in epoch 0 (120ms)
      ✓ deposit in epoch 3, withdraw in epoch 3 (163ms)
      ✓ deposit in epoch 2, withdraw in epoch 3 (147ms)
      ✓ multiple users deposit (119ms)
      ✓ multiple users deposit epoch 0 then 1 withdraw epoch 1 (191ms)
      ✓ multiple users deposit epoch 0 then 1 withdraw epoch 2 (216ms)
      ✓ multiple deposits in same epoch (121ms)
      ✓ deposit epoch 2, deposit epoch 3, withdraw epoch 3 (231ms)
      ✓ deposit epoch 1, deposit epoch 3, withdraw epoch 3 (229ms)
      ✓ deposit epoch 1, deposit epoch 4, deposit epoch 5, withdraw epoch 5 (398ms)
    getEpochPoolSize
      ✓ Reverts if there's a gap (62ms)
      ✓ Returns pool size when epoch is initialized (94ms)
      ✓ Returns 0 when there was no action ever (44ms)
      ✓ Returns correct balance where there was an action at some point (92ms)
    currentEpochMultiplier
      ✓ Returns correct value (45ms)
    computeNewMultiplier
      ✓ Returns correct value
    emergencyWithdraw
      ✓ Does not work if less than 10 epochs passed
      ✓ Reverts if user has no balance
      ✓ Reverts if user has balance but less than 10 epochs passed (63ms)
      ✓ Reverts if user has balance, more than 10 epochs passed but somebody else did a withdraw (186ms)
      ✓ Works if more than 10 epochs passed with no withdraw (89ms)
    Events
      ✓ Deposit emits Deposit event (55ms)
      ✓ Withdraw emits Withdraw event (91ms)
      ✓ ManualEpochInit emits ManualEpochInit event
      ✓ EmergencyWithdraw emits EmergencyWithdraw event (71ms)

  YieldFarm
    General Contract checks
      ✓ should be deployed
      ✓ Get epoch PoolSize and distribute tokens (331ms)
    Contract Tests
      ✓ User harvest and mass Harvest (491ms)
      ✓ Have nothing to harvest (322ms)
      ✓ harvest maximum 25 epochs (863ms)
      ✓ gives epochid = 0 for previous epochs
      ✓ it should return 0 if no deposit in an epoch (39ms)
    Events
      ✓ Harvest emits Harvest (179ms)
      ✓ MassHarvest emits MassHarvest (431ms)

  YieldFarm Bond Pool
    General Contract checks
      ✓ should be deployed
      ✓ Get epoch PoolSize and distribute tokens (145ms)
    Contract Tests
      ✓ User harvest and mass Harvest (308ms)
      ✓ Have nothing to harvest (181ms)
      ✓ harvest maximum 12 epochs (303ms)
      ✓ gives epochid = 0 for previous epochs
      ✓ it should return 0 if no deposit in an epoch
      ✓ it should be epoch1 when staking epoch is 5
    Events
      ✓ Harvest emits Harvest (99ms)
      ✓ MassHarvest emits MassHarvest (148ms)

  YieldFarm Liquidity Pool
    General Contract checks
      ✓ should be deployed
      ✓ Get epoch PoolSize and distribute tokens (133ms)
    Contract Tests
      ✓ User harvest and mass Harvest (305ms)
      ✓ Have nothing to harvest (496ms)
      ✓ harvest maximum 100 epochs (1728ms)
      ✓ gives epochid = 0 for previous epochs
      ✓ it should return 0 if no deposit in an epoch
    Events
      ✓ Harvest emits Harvest (113ms)
      ✓ MassHarvest emits MassHarvest (210ms)


  80 passing (17s)

-------------------------|----------|----------|----------|----------|----------------|
File                     |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-------------------------|----------|----------|----------|----------|----------------|
 contracts/              |      100 |    88.89 |      100 |      100 |                |
  CommunityVault.sol     |      100 |      100 |      100 |      100 |                |
  Staking.sol            |      100 |    93.75 |      100 |      100 |                |
  YieldFarm.sol          |      100 |       85 |      100 |      100 |                |
  YieldFarmBond.sol      |      100 |       85 |      100 |      100 |                |
  YieldFarmLP.sol        |      100 |       85 |      100 |      100 |                |
 contracts/interfaces/   |      100 |      100 |      100 |      100 |                |
  IStaking.sol           |      100 |      100 |      100 |      100 |                |
 contracts/mocks/        |    73.33 |      100 |    85.71 |    73.33 |                |
  ERC20Mock.sol          |      100 |      100 |      100 |      100 |                |
  ERC20Mock6Decimals.sol |       50 |      100 |       75 |       50 |    29,30,31,33 |
-------------------------|----------|----------|----------|----------|----------------|
All files                |    98.59 |    88.89 |    98.36 |    98.58 |                |
-------------------------|----------|----------|----------|----------|----------------|
```
