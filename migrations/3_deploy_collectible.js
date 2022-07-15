const Marketplace = artifacts.require('Marketplace');
const Collectible = artifacts.require('Collectible');

module.exports = async function (deployer) {
  await deployer.deploy(Marketplace);
  const marketplace = await Marketplace.deployed();
  await deployer.deploy(Collectible, marketplace.address);
};
