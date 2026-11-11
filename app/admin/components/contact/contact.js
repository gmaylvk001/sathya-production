import React, { useEffect, useState } from "react";
import { Icon } from '@iconify/react';
import DateRangePicker from '@/components/DateRangePicker';

export default function ContactComponent() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [contactToEdit, setContactToEdit] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null
  });

  const contactsPerPage = 20;

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/contact/get");
      const data = await response.json();
      if (data.success) {
        setContacts(data.data);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`/api/contact/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();
      if (result.success) {
        setContacts(
          contacts.map((contact) =>
            contact._id === id ? { ...contact, status: "inactive" } : contact
          )
        );
        showAlert("Contact status updated to Inactive", "success");
      } else {
        showAlert(result.message || "Failed to update contact status", "error");
      }
    } catch (error) {
      console.error("Error updating contact status:", error);
      showAlert("Error updating contact status", "error");
    } finally {
      setShowConfirmationModal(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await fetch(`/api/contact/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactToEdit),
      });

      const result = await response.json();
      if (result.success) {
        const updatedItem = result.data || { ...contactToEdit, updatedAt: new Date().toISOString() };
        setContacts(
          contacts.map((contact) =>
            contact._id === id ? { ...contact, ...updatedItem } : contact
          )
        );
        showAlert("Contact updated successfully", "success");
      } else {
        showAlert(result.message || "Failed to update contact", "error");
      }
    } catch (error) {
      console.error("Error updating contact:", error);
      showAlert("Error updating contact", "error");
    } finally {
      setShowEditModal(false);
    }
  };

  const renderDateCell = (createdAt, updatedAt) => {
    const parseDate = (str) => {
      if (!str) return null;
      try {
        const d = new Date(str);
        if (isNaN(d.getTime())) return null;
        const dateFormatted = d.toISOString().split("T")[0];
        const timeFormatted = d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).toLowerCase();
        return { dateFormatted, timeFormatted };
      } catch {
        return null;
      }
    };

    const created = parseDate(createdAt);
    const updated = parseDate(updatedAt);

    const isModified =
      created &&
      updated &&
      Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) > 2000;

    if (isModified && updated) {
      return (
        <div className="flex flex-col items-center justify-center leading-tight py-1">
          <span className="whitespace-nowrap font-medium text-gray-800 text-xs">
            {updated.dateFormatted}
          </span>
          <span className="whitespace-nowrap text-[11px] text-gray-400">
            {updated.timeFormatted}
          </span>
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-0.5">
            Modified
          </span>
        </div>
      );
    }

    if (created) {
      return (
        <div className="flex flex-col items-center justify-center leading-tight py-1">
          <span className="whitespace-nowrap font-medium text-gray-800 text-xs">
            {created.dateFormatted}
          </span>
          <span className="whitespace-nowrap text-[11px] text-gray-400">
            {created.timeFormatted}
          </span>
          <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider mt-0.5">
            Created
          </span>
        </div>
      );
    }

    return "-";
  };

  const showAlert = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMessage("");
      setAlertType("");
    }, 3000);
  };

  const filteredContacts = contacts.filter((contact) => {
    // Apply search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || 
      (contact.email_address && contact.email_address.toLowerCase().includes(searchLower)) ||
      (contact.name && contact.name.toLowerCase().includes(searchLower)) ||
      (contact.mobile_number && contact.mobile_number.toLowerCase().includes(searchLower));
    
    // Apply status filter
    const matchesStatus = statusFilter === "All" || contact.status === statusFilter;
    
    // Apply date filter
    let matchesDate = true;
    if (dateFilter.startDate && dateFilter.endDate && contact.createdAt) {
      const contactDate = new Date(contact.createdAt);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      
      // Set time to beginning and end of day for proper date comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      matchesDate = contactDate >= startDate && contactDate <= endDate;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);
  const startEntry = indexOfFirstContact + 1;
  const endEntry = Math.min(indexOfLastContact, filteredContacts.length);

  const handleDateChange = ({ startDate, endDate }) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDateFilter({
      startDate: null,
      endDate: null
    });
    setCurrentPage(1);
  };


  const exportToExcel = async () => {
    const XLSX = await import("xlsx");

  // Prepare export data
  const dataForExport = filteredContacts.map((item) => ({
    "Created Date": item.createdAt
      ? item.createdAt.split("T")[0]
      : "",
    "Modified Date": item.updatedAt
      ? item.updatedAt.split("T")[0]
      : (item.createdAt ? item.createdAt.split("T")[0] : ""),
    Name: item.name || "",
    Email: item.email_address || "",
    "Mobile Number": item.mobile_number || "",
    City: item.city || "",
    "Enquiry Type": item.enquiry_type || "",
    "Invoice Number": item.invoice_number || "",
    Message: item.message || "",
    Status: item.status || "active",
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataForExport, {
    header: [
      "Created Date",
      "Modified Date",
      "Name",
      "Email",
      "Mobile Number",
      "City",
      "Enquiry Type",
      "Invoice Number",
      "Message",
      "Status",
    ],
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Append sheet
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");

  // Download file
  XLSX.writeFile(
    workbook,
    `contacts_export_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Customer Contact Details</h2>
      </div>

      {alertMessage && (
        <div
          className={`mb-4 p-3 rounded-md ${
            alertType === "success" ? "bg-green-500" : "bg-red-500"
          } text-white`}
        >
          {alertMessage}
        </div>
      )}

      {loading ? (
        <p>Loading contacts...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search contacts..."
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Date Range Picker */}
            <div className="w-full col-span-1 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DateRangePicker onDateChange={handleDateChange} />
                </div>
                {/* {(dateFilter.startDate || dateFilter.endDate) && (
                  <button
                    onClick={clearDateFilter}
                    className="p-2 text-sm text-red-600 hover:text-red-800 bg-red-50 rounded-md"
                    title="Clear date filter"
                  >
                    <Icon icon="mdi:close-circle-outline" className="w-5 h-5" />
                  </button>
                )} */}
              </div>
            </div>

            <div className="w-full col-span-1 md:col-span-1 flex items-end">
                        <button
                          onClick={exportToExcel}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                        >
                          <Icon icon="mdi:microsoft-excel" className="text-lg" />
                          Export to Excel
                        </button>
                      </div>

            {/* Add Contact Button (if needed) */}
            {/* <div className="flex justify-end">
              <button
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition"
                onClick={() => {
                  setContactToEdit({
                    email_address: "",
                    name: "",
                    mobile_number: "",
                    message: "",
                    status: "active"
                  });
                  setShowEditModal(true);
                }}
              >
                + Add Contact
              </button>
            </div> */}
          </div>
          <hr className="border-t border-gray-200 mb-4" />

          {filteredContacts.length === 0 ? (
            <p className="text-center">No contacts found</p>
          ) : (
            <>
              <table className="w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-200 text-center">
                    <th className="p-2 whitespace-nowrap">Date</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Mobile Number</th>
                    <th className="p-2">City</th>
                    <th className="p-2 whitespace-nowrap">Enquiry Type</th>
                    <th className="p-2">Message</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentContacts.map((contact) => (
                    <tr key={contact._id} className="text-center border-b hover:bg-gray-50 transition">
                      <td className="p-2 whitespace-nowrap">{renderDateCell(contact.createdAt, contact.updatedAt)}</td>
                      <td className="p-2 font-medium text-gray-800">{contact.name || '-'}</td>
                      <td className="p-2">{contact.email_address || '-'}</td>
                      <td className="p-2">{contact.mobile_number || '-'}</td>
                      <td className="p-2">{contact.city || '-'}</td>
                      <td className="p-2 whitespace-nowrap">{contact.enquiry_type || '-'}</td>
                      <td className="p-2 max-w-xs truncate" title={contact.message}>{contact.message || '-'}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          contact.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {contact.status || 'active'}
                        </span>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => {
                              setContactToEdit({ ...contact });
                              setShowEditModal(true);
                            }}
                            className="w-8 h-8 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-full inline-flex items-center justify-center transition shadow-xs cursor-pointer"
                            title="Edit Contact"
                          >
                            <Icon icon="mingcute:edit-line" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Section */}
              <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
                <div className="text-sm text-gray-600">
                  Showing {startEntry} to {endEntry} of {filteredContacts.length} entries
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 border rounded-md ${
                      currentPage === 1
                        ? "text-gray-400 cursor-not-allowed bg-gray-100"
                        : "text-black bg-white hover:bg-gray-100"
                    }`}
                  >
                    «
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => paginate(i + 1)}
                      className={`px-3 py-1.5 border rounded-md ${
                        currentPage === i + 1
                          ? "bg-red-500 text-white"
                          : "text-black bg-white hover:bg-gray-100"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 border rounded-md ${
                      currentPage === totalPages
                        ? "text-gray-400 cursor-not-allowed bg-gray-100"
                        : "text-black bg-white hover:bg-gray-100"
                    }`}
                  >
                    »
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Delete Contact</h2>
            <p className="mb-4">Are you sure you want to delete this contact?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="bg-gray-300 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(contactToDelete)}
                className="bg-red-500 px-4 py-2 rounded-md text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Icon icon="mingcute:edit-line" className="text-blue-600 w-5 h-5" />
                {contactToEdit?._id ? "Edit Contact Details" : "Add Contact"}
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>
            </div>

            {contactToEdit?.createdAt && (
              <div className="text-xs text-gray-600 mb-4 bg-gray-50 border border-gray-200 p-2.5 rounded-lg flex flex-wrap justify-between gap-2">
                <span>
                  Created: <strong className="text-gray-800">{new Date(contactToEdit.createdAt).toLocaleString("en-IN")}</strong>
                </span>
                <span>
                  Modified: <strong className="text-gray-800">{contactToEdit.updatedAt ? new Date(contactToEdit.updatedAt).toLocaleString("en-IN") : "-"}</strong>
                </span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (contactToEdit?._id) {
                  handleEdit(contactToEdit._id);
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={contactToEdit?.name || ""}
                    onChange={(e) =>
                      setContactToEdit({ ...contactToEdit, name: e.target.value })
                    }
                    className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={contactToEdit?.email_address || ""}
                    onChange={(e) =>
                      setContactToEdit({ ...contactToEdit, email_address: e.target.value })
                    }
                    className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={contactToEdit?.mobile_number || ""}
                    onChange={(e) =>
                      setContactToEdit({ ...contactToEdit, mobile_number: e.target.value })
                    }
                    className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">City</label>
                  <input
                    type="text"
                    value={contactToEdit?.city || ""}
                    onChange={(e) =>
                      setContactToEdit({ ...contactToEdit, city: e.target.value })
                    }
                    className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Enquiry Type</label>
                  <input
                    type="text"
                    value={contactToEdit?.enquiry_type || ""}
                    onChange={(e) =>
                      setContactToEdit({ ...contactToEdit, enquiry_type: e.target.value })
                    }
                    placeholder="e.g. Order Support"
                    className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={contactToEdit?.invoice_number || ""}
                    onChange={(e) =>
                      setContactToEdit({ ...contactToEdit, invoice_number: e.target.value })
                    }
                    placeholder="Optional"
                    className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Status</label>
                  <select
                    value={contactToEdit?.status || "active"}
                    onChange={(e) =>
                      setContactToEdit({ ...contactToEdit, status: e.target.value })
                    }
                    className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-red-400 focus:outline-none bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Message</label>
                  <textarea
                    value={contactToEdit?.message || ""}
                    onChange={(e) =>
                      setContactToEdit({ ...contactToEdit, message: e.target.value })
                    }
                    className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                    rows="3"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#d72828] hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}