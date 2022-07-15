pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Collectible is ERC721URIStorage {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    address marketplaceContract;

    event NFTMinted(uint256);

    mapping(string => uint8) hashes;

    constructor(address _marketplaceContract)
        public
        ERC721("Collectible", "COL")
    {
        marketplaceContract = _marketplaceContract;
    }

    function mint(string memory _tokenURI) public {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        setApprovalForAll(marketplaceContract, true);
        emit NFTMinted(newTokenId);
    }
}
