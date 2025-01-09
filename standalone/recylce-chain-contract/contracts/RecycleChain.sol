// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "solana";
import  '@openzeppelin/contracts/utils/Strings.sol';

contract RecycleChain {
   uint256 public productCounter;
   address public owner;
   address public authority; // Address of the authority account

   enum ProductStatus {
      MANUFACTURED,
      SOLD,
      RETURNED,
      RECYCLED
   }

   struct Product {
      uint256 id;
      string name;
      uint256 quantity;
      address manufacturer;
      ToxicItem[] toxicItems;
   }

   struct ToxicItem {
      string name;
      uint256 weight;
   }

   struct ProductItem {
      string id;
      uint256 productId;
      ProductStatus status;
   }

   struct Manufacturer {
      string name;
      string location;
      string contact;
   }

   Product[] public products;
   ProductItem[] public productItems;
   Manufacturer[] public manufacturers;

   event ProductCreated(uint256 productId, string name, address manufacturer);
   event ToxicItemCreated(uint256 productId, string name, uint256 weight);
   event ProductItemAdded(string[] itemIds, uint256 productId);
   event ProductItemsStatusChanged(string[] itemIds, ProductStatus status);
   event ManufacturerRegistered(
      address manufacturer, string name, string location, string contact
   );

   // Constructor function, accepting the authority address
   constructor(address _owner, address _authority) {
      productCounter = 0;
      owner = _owner;
      authority = _authority; // Set the authority account
   }

   // Register a manufacturer, requiring the authority to be the signer
   @signer(authorityAccount)
   function registerManufacturer(
      address manufacturerAddress,
      string memory _name,
      string memory _location,
      string memory _contact
   ) external {
      assert(
         tx.accounts.authorityAccount.key == authority
            && tx.accounts.authorityAccount.is_signer
      );
      require(bytes(_name).length > 0, "Manufacturer name cannot be empty");

      // Check if the manufacturer is already registered
      for (uint256 i = 0; i < manufacturers.length; i++) {
         require(
            manufacturers[i].name != _name, "Manufacturer already registered"
         );
      }

      Manufacturer memory newManufacturer =
         Manufacturer({name: _name, location: _location, contact: _contact});

      manufacturers.push(newManufacturer);
      emit ManufacturerRegistered(
         manufacturerAddress, _name, _location, _contact
      );
   }

   // Add a product, requiring the authority to be the signer
   @signer(authorityAccount)
   function addProduct(
      string memory _name,
      string[] memory toxicNames,
      uint256[] memory toxicWeights
   ) external {
      assert(
         tx.accounts.authorityAccount.key == authority
            && tx.accounts.authorityAccount.is_signer
      );
      require(bytes(_name).length > 0, "Product name cannot be empty");
      require(
         toxicNames.length == toxicWeights.length, "Toxic array items mismatch"
      );

      // Check if the manufacturer is registered
      bool isRegistered = false;
      address sender = tx.accounts.authorityAccount.key; // Get the signer account

      for (uint256 i = 0; i < manufacturers.length; i++) {
         // Match the sender address to the manufacturer's registered name
         if (
            keccak256(abi.encodePacked(manufacturers[i].name))
               == keccak256(abi.encodePacked(sender))
         ) {
            isRegistered = true;
            break;
         }
      }

      require(isRegistered, "Manufacturer not registered");

      productCounter++;

      uint256 productId = productCounter; // Increment productId

      Product storage newProduct = products[productId];
      newProduct.id = productId;
      newProduct.name = _name;
      newProduct.quantity = 0;
      newProduct.manufacturer = sender; // Use sender's address

      emit ProductCreated(productId, _name, sender);

      for (uint256 i = 0; i < toxicNames.length; i++) {
         ToxicItem memory toxicItem =
            ToxicItem({name: toxicNames[i], weight: toxicWeights[i]});

         products[productId].toxicItems.push(toxicItem);
      }
   }

   @signer(authorityAccount)
   function addProductItems(uint256 _productId, uint256 _quantity) external {
      address sender = tx.accounts.authorityAccount.key; // Get the signer account

      require(
         _quantity <= 10, "Cannot add more than 10 product items at a time"
      );

      require(
         sender == products[_productId].manufacturer,
         "Only the product manufacturer can add product items"
      );

      require(products[_productId].id == _productId, "Product does not exist.");

      string[] memory newProductItemIds = new string[](_quantity);
      // Update the product quantity (state change)
      // for (uint256 i = 0; i < _quantity; i++) {
      //    string memory itemId = string(
      //       abi.encodePacked(
      //          Strings.toString(_productId),
      //          "_",
      //          Strings.toString(products[_productId].quantity + i + 1)
      //       )
      //    );
      // }
      ProductItem memory newItem = ProductItem({
         id: itemId,
         productId: _productId,
         status: ProductStatus.MANUFACTURED
      });
   }
}
