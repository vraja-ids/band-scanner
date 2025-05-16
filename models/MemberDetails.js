class MemberDetails {
  constructor(data) {
    this.memberId = data.memberId;
    this.legalName = data.legalName;
    this.spiritualName = data.spiritualName;
    this.isSPDisciple = data.isSPDisciple;
    this.requestedActivity = data.requestedActivity;
    this.totalCount = data.totalCount || 0;
    this.sponsorAmount = data.sponsorAmount || 0;
    this.registrationType = data.registrationType;
    this.mealOption = data.mealOption || '';
    this.servicesOffered = data.servicesOffered || '';
    this.giftDetails = this.parseGiftDetails(data.giftDetails);
    this.giftStatus = this.parseGiftStatus(data.giftStatus);
  }

  parseGiftDetails(giftDetails) {
    if (!giftDetails || !Array.isArray(giftDetails)) return [];
    return giftDetails.map(detail => {
      const giftObj = {};
      // Dynamically get all gift keys from the detail object
      Object.keys(detail).forEach(key => {
        if (key.startsWith('Gift')) {
          giftObj[key.toLowerCase()] = detail[key] || '';
        }
      });
      return giftObj;
    });
  }

  parseGiftStatus(giftStatus) {
    if (!giftStatus) return {
      tshirtApproved: 0,
      tshirtFulfilled: 0,
      jacketApproved: 0,
      jacketFulfilled: 0,
      registrationpaymentFulfilled: false
    };
    return giftStatus;
  }

  getDisplayName() {
    return this.spiritualName || this.legalName;
  }

  getGiftStatus(giftType) {
    if (!this.giftStatus) return 'Not-Approved';
    const approved = this.giftStatus[`${giftType}Approved`] || 0;
    const fulfilled = this.giftStatus[`${giftType}Fulfilled`] || 0;
    
    if (fulfilled > 0) return 'Fulfilled';
    if (approved > 0) return 'Approved';
    return 'Not-Approved';
  }

  getGiftCounts(giftType) {
    return {
      approved: this.giftStatus[`${giftType}Approved`] || 0,
      fulfilled: this.giftStatus[`${giftType}Fulfilled`] || 0
    };
  }
}

export default MemberDetails; 