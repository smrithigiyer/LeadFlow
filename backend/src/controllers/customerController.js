const Lead                  = require('../models/Lead')
const { successResponse, errorResponse } = require('../utils/apiResponse')

const buildCustomerFilter = (query) => {
  const filter = { status: 'converted' }
  if (query.source)     filter.source     = query.source
  if (query.assignedTo) filter.assignedTo = { $regex: query.assignedTo, $options: 'i' }
  if (query.search) {
    filter.$or = [
      { name:    { $regex: query.search, $options: 'i' } },
      { email:   { $regex: query.search, $options: 'i' } },
      { phone:   { $regex: query.search, $options: 'i' } },
      { company: { $regex: query.search, $options: 'i' } },
    ]
  }
  if (query.from || query.to) {
    filter.convertedAt = {}
    if (query.from) filter.convertedAt.$gte = new Date(query.from)
    if (query.to)   filter.convertedAt.$lte = new Date(query.to)
  }
  return filter
}

// ── GET /customers ─────────────────────────────────────────────
exports.getCustomers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 12)
    const skip  = (page - 1) * limit
    const sort  = req.query.sort || '-convertedAt'

    const filter = buildCustomerFilter(req.query)
    const [customers, total] = await Promise.all([
      Lead.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Lead.countDocuments(filter),
    ])

    successResponse(res, 200, 'Customers fetched', customers, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /customers/stats ───────────────────────────────────────
exports.getCustomerStats = async (_req, res, next) => {
  try {
    const now       = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalAgg, monthlyAgg, dealAgg, sourceAgg] = await Promise.all([
      Lead.countDocuments({ status: 'converted', isDeleted: false }),
      Lead.countDocuments({ status: 'converted', isDeleted: false, convertedAt: { $gte: monthStart } }),
      Lead.aggregate([
        { $match: { status: 'converted', isDeleted: false, dealValue: { $ne: null, $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$dealValue' }, avg: { $avg: '$dealValue' }, count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { status: 'converted', isDeleted: false } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
    ])

    const deal = dealAgg[0] || { total: 0, avg: 0, count: 0 }

    successResponse(res, 200, 'Customer stats fetched', {
      total:          totalAgg,
      thisMonth:      monthlyAgg,
      totalDealValue: deal.total,
      avgDealValue:   deal.avg ? Math.round(deal.avg) : 0,
      withDealValue:  deal.count,
      sourceBreakdown: sourceAgg.map(({ _id, count }) => ({ name: _id || 'unknown', value: count })),
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /customers/:id ─────────────────────────────────────────
exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await Lead.findOne({ _id: req.params.id, status: 'converted' })
      .populate({ path: 'followups', options: { sort: { scheduledAt: -1 } } })
      .lean({ virtuals: true })

    if (!customer) return errorResponse(res, 404, 'Customer not found')
    successResponse(res, 200, 'Customer fetched', customer)
  } catch (err) {
    next(err)
  }
}

// ── PATCH /customers/:id ───────────────────────────────────────
exports.updateCustomer = async (req, res, next) => {
  try {
    const allowed = ['dealValue', 'notes', 'assignedTo', 'company', 'phone']
    const update  = {}
    allowed.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f] })

    const customer = await Lead.findOneAndUpdate(
      { _id: req.params.id, status: 'converted' },
      update,
      { new: true, runValidators: true }
    )

    if (!customer) return errorResponse(res, 404, 'Customer not found')
    successResponse(res, 200, 'Customer updated', customer)
  } catch (err) {
    next(err)
  }
}
