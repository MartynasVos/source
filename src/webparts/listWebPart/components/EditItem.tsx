import * as React from "react";
import { IEditItemProps } from "./ListItems";
import {
  DatePicker,
  DefaultButton,
  FocusTrapZone,
  Layer,
  Overlay,
  Popup,
  TextField,
  addDays,
  ComboBox,
  IComboBoxOption,
  PrimaryButton,
  IComboBox,
} from "@fluentui/react";

import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { SPFx, spfi } from "@pnp/sp";
import { IRequest } from "./List";
import * as moment from "moment";
import styles from "./ListWebPart.module.scss";
import { DeleteItem } from "./DeleteItem";
import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IDeleteItemProps {
  context: WebPartContext;
  setItems: React.Dispatch<React.SetStateAction<IRequest[]>>;
  hidePopup: () => void;
  currentItem: IRequest;
  getItems: () => Promise<IRequest[]>;
}

export const EditItem = (
  props: IEditItemProps
): React.ReactElement<unknown, React.JSXElementConstructor<unknown>> => {
  const [selectedManagerId, setSelectedManagerId] = React.useState<number>();
  const [selectedDate, setSelectedDate] = React.useState<Date>();
  const [selectedRequestTypeId, setSelectedRequestTypeId] =
    React.useState<number>();
  const [selectedRequestAreaChoice, setSelectedRequestAreaChoice] =
    React.useState<string>();
  const [selectedTagsIds, setSelectedTagsIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setData();
  }, [props.currentItem]);

  function setData(): void {
    setSelectedDate(moment(props.currentItem?.DueDate).toDate());
    setSelectedRequestTypeId(props.currentItem?.RequestTypeId);
    setSelectedRequestAreaChoice(props.currentItem?.RequestArea);
    const tagIds: string[] = [];
    props.currentItem?.Tags.map((tag: { TermGuid: string }) => {
      tagIds.push(tag.TermGuid);
    });
    setSelectedTagsIds(tagIds);
    setSelectedManagerId(0);
  }
  function editItemFunction(): void {
    const title = (document.getElementById("title") as HTMLInputElement).value;
    const description = (
      document.getElementById("description") as HTMLInputElement
    ).value;
    let status = "New";
    if (props.isRequestManager) {
      status = "In Progress";
      if (selectedManagerId === 0) {
        return alert("Assigned Manager field is mandatory");
      }
    }
    const editItem = async (): Promise<void> => {
      const sp = spfi().using(SPFx(props.context));
      const list = sp.web.lists.getByTitle("Requests");
      const i = await list.items.getById(props.currentItem.Id).update({
        Title: title,
        Description: description,
        DueDate: selectedDate,
        Assigned_x0020_ManagerId: selectedManagerId,
        RequestTypeId: selectedRequestTypeId,
        RequestArea: selectedRequestAreaChoice,
        Status: status,
      });
      const fields = await sp.web.lists
        .getByTitle("Requests")
        .fields.filter("Title eq 'Tags_0'")
        .select("Title", "InternalName")();
      const updateTags: { [key: string]: unknown } = {};
      updateTags[fields[0].InternalName] = selectedTagsIds.join(";");
      await i.item.update(updateTags);
      console.log(i);
    };

    editItem().then(
      () => {
        props.getItems().then(
          (result) => {
            props.setItems(result);
          },
          () => {
            return;
          }
        );
      },
      () => {
        return;
      }
    );
    props.hidePopup();
  }

  const onFormatDate = (date?: Date): string => {
    return !date
      ? ""
      : moment(
          `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
          "YYYY-MM-DD"
        ).format("YYYY-MM-DD");
  };
  const setTags = (
    event: React.FormEvent<IComboBox>,
    option?: IComboBoxOption
  ): void => {
    if (option && typeof option.key === "string")
      if (selectedTagsIds.indexOf(option.key) === -1) {
        selectedTagsIds.push(option.key);
      } else {
        selectedTagsIds.splice(selectedTagsIds.indexOf(option.key), 1);
      }
  };
  return (
    <>
      {props.isPopupVisible && (
        <Layer>
          <Popup
            className={styles.modalBox}
            role="dialog"
            aria-modal="true"
            onDismiss={props.hidePopup}
            enableAriaHiddenSiblings={true}
          >
            <Overlay onClick={props.hidePopup} />
            <FocusTrapZone>
              <div role="document" className={styles.modalContent}>
                <TextField
                  label="Title"
                  id="title"
                  required
                  disabled={props.isRequestManager ? true : false}
                  defaultValue={props.currentItem?.Title}
                />
                <TextField
                  label="Description"
                  id="description"
                  required
                  multiline
                  rows={5}
                  disabled={props.isRequestManager ? true : false}
                  defaultValue={props.currentItem?.Description}
                />
                <DatePicker
                  id="dueDate"
                  className={styles.formField}
                  label="Due Date"
                  isRequired
                  isMonthPickerVisible={false}
                  minDate={addDays(new Date(), 3)}
                  onSelectDate={(date: Date) =>
                    setSelectedDate(moment(date, "YYYY-MM-DD").toDate())
                  }
                  value={selectedDate}
                  formatDate={onFormatDate}
                  disabled={props.isRequestManager ? true : false}
                />
                {props.isRequestManager ? (
                  props.requestManagers !== undefined ? (
                    <ComboBox
                      className={styles.formField}
                      label="Assign a manager"
                      required
                      options={props.requestManagers}
                      autoComplete="on"
                      onItemClick={(e, option: IComboBoxOption) =>
                        typeof option.key !== "string"
                          ? setSelectedManagerId(option.key)
                          : null
                      }
                    />
                  ) : null
                ) : null}
                <Dropdown
                  className={styles.formField}
                  label="Request Type"
                  required
                  defaultSelectedKey={selectedRequestTypeId}
                  onChange={(e, item: IDropdownOption) =>
                    typeof item.key !== "string"
                      ? setSelectedRequestTypeId(item.key)
                      : null
                  }
                  options={props.requestTypes}
                />
                {props.requestAreaChoices !== undefined ? (
                  <Dropdown
                    className={styles.formField}
                    label="Request area"
                    defaultSelectedKey={selectedRequestAreaChoice}
                    onChange={(e, item: IDropdownOption) =>
                      setSelectedRequestAreaChoice(item.text)
                    }
                    options={props.requestAreaChoices}
                  />
                ) : null}
                <ComboBox
                  className={styles.formField}
                  label="Tags"
                  options={props.taxonomy}
                  autoComplete="on"
                  onChange={setTags}
                />
                <div className={styles.editButtonsContainer}>
                  <PrimaryButton
                    onClick={() => {
                      editItemFunction();
                    }}
                  >
                    Update
                  </PrimaryButton>
                  <DeleteItem
                    context={props.context}
                    setItems={props.setItems}
                    hidePopup={props.hidePopup}
                    currentItem={props.currentItem}
                    getItems={props.getItems}
                  />
                  <DefaultButton
                    onClick={() => {
                      props.hidePopup();
                      setData();
                    }}
                  >
                    Cancel
                  </DefaultButton>
                </div>
              </div>
            </FocusTrapZone>
          </Popup>
        </Layer>
      )}
    </>
  );
};
