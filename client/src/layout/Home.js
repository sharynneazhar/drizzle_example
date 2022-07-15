import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Web3 from 'web3';

import Marketplace from '../artifacts/Marketplace.json';
import Collectible from '../artifacts/Collectible.json';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET_KEY = process.env.PINATA_API_SECRET_KEY;

const Home = ({ drizzle, drizzleState }) => {
  const [fileAsset, setFileAsset] = useState();
  const [formInput, updateFormInput] = useState({ name: '', description: '' });
  const [nfts, setNfts] = useState([]);

  const loadNFTs = async () => {
    const networkId = await drizzle.web3.eth.net.getId();
    const marketplaceContract = new drizzle.web3.eth.Contract(
      Marketplace.abi,
      Marketplace.networks[networkId].address
    );

    const listings = await marketplaceContract.methods.getListedNfts().call();
    const nfts = await Promise.all(
      listings.map(async (i) => {
        try {
          const collectibleContract = new drizzle.web3.eth.Contract(
            Collectible.abi,
            Collectible.networks[networkId].address
          );

          const tokenURI = await collectibleContract.methods
            .tokenURI(i.tokenId)
            .call();

          const meta = await axios.get(tokenURI);
          const nft = {
            price: i.price,
            tokenId: i.tokenId,
            seller: i.seller,
            owner: i.buyer,
            image: meta.data.image,
            name: meta.data.name,
            description: meta.data.description,
          };

          return nft;
        } catch (err) {
          console.log(err);
          return null;
        }
      })
    );

    setNfts(nfts.filter((nft) => nft !== null));
  };

  useEffect(() => {
    loadNFTs();
  }, []);

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    setFileAsset(file);
  };

  const addAssetToPinata = async () => {
    try {
      const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
      let data = new FormData();
      data.append('file', fileAsset);

      const pinataResult = await axios.post(url, data, {
        maxContentLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET_KEY,
        },
      });

      console.log('Asset upload successful', pinataResult.data);
      return `https://ipfs.io/ipfs/${pinataResult.data.IpfsHash}`;
    } catch (error) {
      console.log('Error uploading file: ', error);
    }
  };

  const listNFTForSale = async () => {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    const assetIpfsUrl = await addAssetToPinata();

    const data = {
      name: formInput.name,
      description: formInput.description,
      image: assetIpfsUrl,
    };

    const pinataResult = await axios.post(url, data, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET_KEY,
      },
    });

    console.log('Metadata upload successful', pinataResult.data);
    const metadataUrl = `https://ipfs.io/ipfs/${pinataResult.data.IpfsHash}`;
    const networkId = await drizzle.web3.eth.net.getId();

    // Mint the NFT
    const collectibleContractAddress = Collectible.networks[networkId].address;
    const marketplaceContractAddress = Marketplace.networks[networkId].address;
    const collectibleContract = new drizzle.web3.eth.Contract(
      Collectible.abi,
      collectibleContractAddress
    );
    const accounts = await new drizzle.web3.eth.getAccounts();
    const marketplaceContract = new drizzle.web3.eth.Contract(
      Marketplace.abi,
      marketplaceContractAddress
    );

    let listingFee = await marketplaceContract.methods.getListingFee().call();
    listingFee = listingFee.toString();

    collectibleContract.methods
      .mint(metadataUrl)
      .send({ from: accounts[0], gas: 2000000 })
      .on('receipt', (receipt) => {
        console.log('Minted Collectible');

        // List the NFT
        const tokenId = receipt.events.NFTMinted.returnValues[0];
        marketplaceContract.methods
          .listNft(
            collectibleContractAddress,
            tokenId,
            Web3.utils.toWei('1', 'ether')
          )
          .send({ from: accounts[0], gas: 2000000, value: listingFee })
          .on('receipt', (r) => {
            console.log('Listed');
          });
      });
  };

  if (!nfts.length) {
    return <h1 className='px-20 py-10 text-3xl'>No pets available!</h1>;
  }

  return (
    <div className='p-4'>
      <h2>Marketplace NFTs</h2>

      <div className='flex justify-flex-start'>
        <div className='flex align-center'>
          <div className='flex flex-col pb-12'>
            <input
              placeholder='Asset Name'
              className='mt-8 border rounded p-4'
              onChange={(e) =>
                updateFormInput({ ...formInput, name: e.target.value })
              }
            />
            <textarea
              placeholder='Asset Description'
              className='mt-2 border rounded p-4'
              onChange={(e) =>
                updateFormInput({ ...formInput, description: e.target.value })
              }
            />
            <input
              type='file'
              name='Asset'
              className='my-4'
              onChange={uploadFile}
            />
            <button
              onClick={listNFTForSale}
              className='font-bold mt-4 bg-teal-400 text-white rounded p-4 shadow-lg'
            >
              Mint and list NFT
            </button>
          </div>
          <div className='m-8 ml-20'>
            <h4 className='mb-4 font-bold'>Preview:</h4>
            {fileAsset && (
              <img className='rounded' src={URL.createObjectURL(fileAsset)} />
            )}
          </div>
        </div>
      </div>

      <hr></hr>

      <h2>Listed NFTs</h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4'>
        {nfts.map((nft, i) => (
          <div key={i} className='border shadow rounded-l overflow-hidden'>
            <img src={nft.image} />
            <div className='p-4'>
              <p className='text-xl font-semibold'>{nft.name}</p>
              <div style={{ overflow: 'hidden' }}>
                <p className='text-gray-400'>{nft.description}</p>
              </div>
            </div>
            <div className='p-4 bg-black'>
              <p className='text-xl font-bold text-white'>
                {Web3.utils.fromWei(nft.price, 'ether')} ETH
              </p>
              <button
                className='mt-4 w-full bg-teal-400 text-white font-bold py-2 px-12 rounded'
                onClick={() => {}}
              >
                Buy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
